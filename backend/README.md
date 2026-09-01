# Flask API

REST backend for the Kanban board. **Project** is the aggregate: wizard constraints, team, and the board (columns + work items) all hang off it.

```
Project
  ├── members
  ├── milestones
  ├── columns
  └── tasks (epic / story / task, optional parent, assignee, estimates, dependsOn)
```

## Run with Docker

Set `SECRET_KEY` in the **repo-root** `.env` first (`cp .env.example .env`). Compose refuses to start without it.

From the repo root (starts Postgres, this API on port 3000, and the frontend on 8080):

```bash
docker compose up --build
```

## Run locally

Postgres and Redis must be up (`docker compose up database redis` is enough). Then:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
# Set SECRET_KEY in the repo-root .env (required). Then:
flask db upgrade
flask seed
flask run --host 127.0.0.1 --port 3000
```

In another terminal, start the planner worker:

```bash
source .venv/bin/activate
python -m app.worker
```

Point the Next.js app at this API with `npm run dev` from `frontend/`. The browser opens a WebSocket to the API (`ws://localhost:3000/ws` by default; override with `NEXT_PUBLIC_WS_URL`). Project rooms are `kanbain:room:project:{id}`. Planning status and board edits publish on Redis after commit; the 2s HTTP poll is only a fallback if the socket is down.

## Tests

```bash
pytest
```

## API

JSON field names are camelCase (`projectId`, `columnId`, `createdAt`).

When a single project exists (the seeded default), `GET/POST /api/columns` and `GET /api/tasks` may omit `projectId`. Once there is more than one project, `projectId` is required.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Checks the database connection |
| GET / PUT | `/api/settings` | OpenAI API key for the planner; encrypted at rest with `SECRET_KEY`; GET never returns the secret |
| GET / POST | `/api/projects` | Wizard fields; creates default columns; enqueues the planner (`planStatus: planning`) |
| GET / PUT / DELETE | `/api/projects/<id>` | DELETE cascades board data |
| POST | `/api/projects/<id>/plan` | Re-enqueue the planner (`failed` or `ready`) |
| WS | `/ws` | JSON events for subscribed project rooms (`plan.updated`, `board.updated`) |
| GET / POST | `/api/projects/<id>/members` | Team: name, role, seniority, capacity |
| PUT / DELETE | `/api/projects/<id>/members/<id>` | |
| GET / POST | `/api/projects/<id>/milestones` | |
| PUT / DELETE | `/api/projects/<id>/milestones/<id>` | |
| GET | `/api/columns` | `?projectId=` — sorted by `order` |
| POST | `/api/columns` | `{ "title", "projectId"?, "id"? }` |
| PUT | `/api/columns/<id>` | `{ "title" }` |
| DELETE | `/api/columns/<id>` | 204 even if the column is already gone; cascades tasks |
| GET | `/api/tasks` | `?projectId=&columnId=&category=&priority=&workKind=` |
| GET | `/api/tasks/<id>` | 404 if missing |
| POST | `/api/tasks` | `{ "title", "columnId", ... }` — `projectId` is inferred from the column |
| PUT | `/api/tasks/<id>` | Full update; 404 if missing |
| DELETE | `/api/tasks/<id>` | 204 even if the task is already gone |

Task planning fields the wizard/planner will fill in: `workKind` (`epic` \| `story` \| `task`), `parentId`, `acceptanceCriteria`, `estimateTshirt` / `estimatePoints` / `estimateHours`, `assigneeId`, `milestoneId`, `dependsOn`. Projects expose `planStatus` (`planning` \| `ready` \| `failed`), `thoughtEffort` (`low` \| `medium` \| `high` \| `max`), and `planPhase` while planning. `PLANNER=openai` runs a LangGraph pipeline whose depth follows `thoughtEffort`. Set `PLANNER=stub` to skip the model. Save an API key in Settings or `OPENAI_API_KEY`. After changing `SECRET_KEY`, run `flask rotate-encryption-key` or paste the OpenAI key again. To wipe stored keys, `flask invalidate-openai-keys --yes`.

On first boot the database is seeded with an **Untitled project** and columns **To Do**, **In Progress**, and **Done**.
