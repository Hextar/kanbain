# Project Instructions

KanbAIn is an AI-first Kanban app. Flask (`backend/`) is the source of truth; Next.js (`frontend/`) is the UI + cookie-forwarding API proxy.

## Tech Stack

- Backend: Python 3.12, Flask 3, SQLAlchemy, Alembic, RQ, Redis, Postgres 15 + pgvector
- Frontend: Next.js 16 App Router, React 19, TanStack Query, Tailwind 4
- Tests: `pytest` in `backend/tests/` (SQLite, stub planner, no Redis)

## Backend rules

- Factory: `backend/app/__init__.py` `create_app()`. Worker: `python -m app.worker`.
- Tenant is **organization**. Bind via `g.organization_id` (`identity.py`). Lookups in `lookups.py` 404 across orgs so existence is not leaked.
- JSON is **camelCase**. Validate in `validation.py`; `ValueError` → 400 `{ "message" }`. Unknown rows → 404 via `UnknownEntityError`.
- Auth: httpOnly `kanbain_session` cookie. Gate in `register_auth_gate` — only `/api/health` and `/api/auth/*` are public (`/me` and `/ws-ticket` still need a session).
- After commit, SQLAlchemy hooks in `realtime/hooks.py` publish `plan.updated` / `board.updated`. Do not publish from routes.
- Long work goes through `queue.py` (RQ queue `"kanbain"`). Tests skip enqueue (`TESTING=True`); call `plan_project` in-process.
- Planner: `planner/job.py` → LangGraph in `planner/graph.py`. Depth follows `thought_effort`. `apply_plan` wipes and rewrites the board.
- OpenAI key: Redis ciphertext (`planner/keys.py`), Fernet via `SECRET_KEY`. Never return the key from `/api/settings`.

## Frontend rules

- Modules under `frontend/src/modules/{Auth,Project,Task,Settings}`. Shared UI in `uiKit/`.
- Client prefs (theme, locale) live in Redux Toolkit (`frontend/src/store`). UI copy is `frontend/src/i18n/` + `useT()`. Server data stays in TanStack Query.
- Browser `/api/*` proxies to Flask (`src/app/api/[...path]/route.ts`) and forwards Cookie + `X-Realtime-Client`.
- WebSocket is Flask `:3000/ws?ticket=` (ticket from `GET /api/auth/ws-ticket`). Do not put `SECRET_KEY` in frontend env.

## Testing

- Backend: `cd backend && pytest`
- No frontend unit test runner. `npm run lint` / `npm run build` in `frontend/`.
- Test pattern: `backend/tests/test_*.py`. `client` fixture is a verified user + seeded org.

## Build & Run

- Stack: `docker compose up -d --build database backend worker` then `cd frontend && npm run dev`
- Migrations: `flask db upgrade`. Seed: `flask seed` (default project + wiki corpus).
- Stub planner: `PLANNER=stub`. Mock UI: `npm run dev:mock`.

## Project structure

- `backend/app/routes/` — REST blueprints
- `backend/app/planner/` — LangGraph job
- `backend/app/rag/` — wiki retrieve / scrape
- `backend/app/realtime/` — Redis pub/sub + WS
- `backend/migrations/versions/` — schema
- `wiki/` — human docs (published to GitHub wiki)

## Git

- Commits: `feat|fix|chore|docs|test|perf|ci:` conventional-ish, imperative.
- Default branch: `main`. CI: npm/pip audit + wiki publish; no pytest in Actions.
