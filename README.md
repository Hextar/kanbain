# KanbAIn

An **AI-first** Kanban dashboard. You describe a project; the AI plans the work.

There is a gap between tools that generate a document from a prompt and tools that keep a board up to date. KanbAIn is meant to close that gap: a project wizard that knows the team and the deadline, then a board that is already populated with real work.

## Product idea

New projects should not start on an empty board. A short wizard collects the constraints that a planner actually needs:

- **Project** — what you are building, the goal, optional PRD / designs / repo
- **Team** — who is on it (roles, seniority, count)
- **Deadline** — hard date, nice-to-have, or ongoing
- **How you work** — Kanban, Scrum, MVP, production-grade, risk tolerance

From that, the AI should produce a plan that is already on the board, not a markdown dump you copy by hand:

1. Break the project into epics, stories, and **granular tasks**
2. Write a description and acceptance criteria for each card
3. Size the work (t-shirt / points / duration) and set priority
4. Infer dependencies, a critical path, and milestones
5. **Assign** work to the people who should own it
6. **Check the plan against the deadline** — if the load is too high, say so and suggest what to cut, slip, or rebalance

The interesting part is not generating the first board. It is treating the AI as a planner: when someone drops, a task blows up, or the deadline moves, re-plan instead of leaving the board stale.

## Current status

The Kanban UI lives in `frontend/` (Next.js App Router). The Flask API in `backend/` is **project-centric**: each project owns wizard constraints (goal, team, deadline, how you work), a board of columns, and tasks that can be epics/stories/cards. New projects go through a wizard; a background OpenAI planner fills the board. Set `PLANNER=stub` to plan without a model.

- Frontend: [frontend/README.md](frontend/README.md)
- Backend: [backend/README.md](backend/README.md)
- Wiki: [github.com/Hextar/kanbain/wiki](https://github.com/Hextar/kanbain/wiki) — pages live in [`wiki/`](wiki/) and publish to [`kanbain.wiki.git`](https://github.com/Hextar/kanbain.wiki.git)

## Docker

On macOS, start the Docker client before building. Copy `.env.example` to `.env` and set `SECRET_KEY` — Compose will not start without it.

### SECRET_KEY

`SECRET_KEY` is a passphrase **you** choose. It lives only in the **repo-root** `.env` (never in `frontend/`, never committed). Docker Compose injects the same value into the API and the planner worker. Redis stores the OpenAI API key as ciphertext; the worker decrypts it on the server when it calls OpenAI. The browser never sees `SECRET_KEY` or the full OpenAI key.

Put a long random passphrase in `.env` once, start the stack, then paste your OpenAI key in Settings. That is the normal path.

**Changing `SECRET_KEY` does not change your OpenAI key.** It only changes the lock on the copy saved in Redis. After you change it, that saved copy is unreadable until you re-encrypt it or paste the OpenAI key again.

Backend and worker must always share the same `SECRET_KEY`. If they differ, planning cannot decrypt the key. After any edit to `.env`, recreate both:

```bash
docker compose up -d --build backend worker
```

#### Rotating the passphrase

You need the **old** passphrase and the **new** one at the same time. Redis has only ciphertext; there is no way to rotate from the new key alone.

Do this **after** `.env` already contains the new `SECRET_KEY` and the containers have been recreated (so they are using the new key):

```bash
# From the repo root, not backend/
docker compose exec backend flask rotate-encryption-key --old-secret 'the-previous-passphrase'
```

Success looks like `Re-encrypted the stored OpenAI API key (ends in …)`. If the old secret is wrong, the command refuses and leaves Redis unchanged.

**Alternative:** skip the command and paste the OpenAI key again in Settings. The new `SECRET_KEY` encrypts whatever you save. Use this if you no longer have the old passphrase.

If you change `SECRET_KEY` and neither rotate nor re-paste, Settings will look as if no key is saved, and the planner cannot call OpenAI, even though Redis still holds a blob.

#### Invalidating stored OpenAI keys

If you suspect a stored key was leaked, wipe every key saved through Settings (Redis ciphertext). This does **not** revoke the key at OpenAI — rotate it there too.

```bash
# From the repo root. --yes skips the confirmation prompt.
docker compose exec backend flask invalidate-openai-keys --yes
```

The UI then treats planning as unconfigured and opens Settings if someone tries to generate a board. `OPENAI_API_KEY` in the environment is unchanged; that is an operator key, not a Settings-saved key.

### Full stack (built frontend)

```bash
# Frontend (:8080), Flask API (:3000), planner worker, Redis, Postgres
# Postgres and Redis bind to 127.0.0.1 so a public VPS does not expose them.
docker compose up --build
```

`/api` on the frontend container is proxied to Flask. This is a production-style Next.js build. Use it to run the whole app, not to iterate on the UI.

### Frontend development against the real API

Skip the frontend container. Run Postgres, Redis, Flask, and the planner worker in Docker, then Next.js on the host:

```bash
docker compose up -d --build database backend worker
docker compose exec backend flask db upgrade
docker compose exec backend flask seed
```

`flask db upgrade` applies the wiki tables (pgvector). `flask seed` loads the default project **and** the planner’s markdown wiki (PM playbook + software-product pack). The planner retrieves from that wiki on every generate.

Postgres is `pgvector/pgvector:pg15`. If this machine already had a volume from stock `postgres:15`, recreate it or `CREATE EXTENSION vector` will fail:

```bash
docker compose down -v
docker compose up -d --build database backend worker
docker compose exec backend flask db upgrade
docker compose exec backend flask seed
```

In another terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open the URL Next prints. Flask is on port 3000, so the UI is usually http://localhost:3001. Server Components and `/api` talk to Flask.

### Cleanup DB

```bash
docker compose down -v
```

### Mocked frontend (no Flask)

```bash
cd frontend
npm run dev:mock
```

Open http://localhost:3000. Data lives in memory until you restart Next.

Run Flask on the host only when you are changing the API: start Postgres with `docker compose up database`, then follow [backend/README.md](backend/README.md).

## Wiki

The GitHub wiki is a **separate git repo** at [`https://github.com/Hextar/kanbain.wiki.git`](https://github.com/Hextar/kanbain.wiki.git). Edit markdown in [`wiki/`](wiki/) in this repo — that is the source of truth. A workflow on `main` copies those files into the wiki repo so they show up at [github.com/Hextar/kanbain/wiki](https://github.com/Hextar/kanbain/wiki).

To publish immediately from your machine (after the first wiki page exists on GitHub):

```bash
./scripts/publish-wiki.sh
```
