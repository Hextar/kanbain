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

The Kanban UI lives in `frontend/` (Next.js App Router). The Flask API in `backend/` is **project-centric**: each project owns wizard constraints (goal, team, deadline, how you work), a board of columns, and tasks that can be epics/stories/cards. New projects go through a wizard; a background stub planner fills the board. Swap `PLANNER=stub` for a real LLM later.

- Frontend: [frontend/README.md](frontend/README.md)
- Backend: [backend/README.md](backend/README.md)

## Docker

On macOS, start the Docker client before building.

### Full stack (built frontend)

```bash
# Frontend (:8080), Flask API (:3000), planner worker, Redis, Postgres (:5432)
docker compose up --build
```

`/api` on the frontend container is proxied to Flask. This is a production-style Next.js build. Use it to run the whole app, not to iterate on the UI.

### Frontend development against the real API

Skip the frontend container. Run Postgres, Redis, Flask, and the planner worker in Docker, then Next.js on the host:

```bash
docker compose up -d --build database backend worker
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
