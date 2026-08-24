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

The Kanban UI lives in `frontend/`. The Flask API in `backend/` is **project-centric**: each project owns wizard constraints (goal, team, deadline, how you work), a board of columns, and tasks that can be epics/stories/cards. The wizard UI, planner, and estimate feedback are not shipped yet.

- Frontend: [frontend/README.md](frontend/README.md)
- Backend: [backend/README.md](backend/README.md)

## Docker

On macOS, start the Docker client before building.

### Full stack (built frontend)

```bash
# Frontend (:8080), Flask API (:3000), Postgres (:5432)
docker compose up --build
```

`/api` on the frontend container is proxied to Flask. This is a production-style build: no Vite hot reload. Use it to run the whole app, not to iterate on the UI.

### Frontend development against the real API

Skip the frontend container. Run Postgres and Flask in Docker, then Vite on the host with mocks off:

```bash
docker compose up --build database backend
```

In another terminal:

```bash
cd frontend
npm install
npm run dev:prod
```

Open the URL Vite prints (usually http://localhost:5173). `/api` is proxied to Flask on port 3000.

`npm run dev` still uses MSW and does not need Docker.

Run Flask on the host only when you are changing the backend: start Postgres with `docker compose up database`, then follow [backend/README.md](backend/README.md).
