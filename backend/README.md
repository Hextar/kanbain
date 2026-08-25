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

From the repo root (starts Postgres, this API on port 3000, and the frontend on 8080):

```bash
docker compose up --build
```

## Run locally

Postgres must be up (`docker compose up database` is enough). Then:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
flask db upgrade
flask seed
flask run --host 127.0.0.1 --port 3000
```

Point the Next.js app at this API with `npm run dev` from `frontend/`.

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
| GET / POST | `/api/projects` | Wizard fields: goal, PRD/designs/repo, deadline, methodology, quality bar, risk, members |
| GET / PUT / DELETE | `/api/projects/<id>` | DELETE cascades board data |
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

Task planning fields the wizard/planner will fill in: `workKind` (`epic` \| `story` \| `task`), `parentId`, `acceptanceCriteria`, `estimateTshirt` / `estimatePoints` / `estimateHours`, `assigneeId`, `milestoneId`, `dependsOn`.

On first boot the database is seeded with an **Untitled project** and columns **To Do**, **In Progress**, and **Done**.
