# Getting Started

This guide walks you through running KanbAIn locally for development.

---

## Prerequisites

- **Docker** and **Docker Compose** (v2+)
- **Node.js** 20+ and **npm** (for frontend-only development)
- **Python** 3.11+ and **pip** (for backend-only development)
- An **OpenAI API key** (for AI planning; not required in stub/mock mode)

---

## Quick Start (Docker)

The fastest way to run the full stack:

```bash
# 1. Clone the repo
git clone <repo-url>
cd kanbain

# 2. Copy and configure environment files
cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY at minimum (see below)

# 3. Start all services
docker compose up

# 4. Apply database migrations and seed the wiki corpus
docker compose exec backend flask db upgrade
docker compose exec backend flask seed

# 5. Open the app
open http://localhost:8080
```

On first open, create an account at `/signup` (or sign in with Google). Email/password accounts must open the activation link before they can sign in. Then go to **Settings** and enter your OpenAI API key. The key is encrypted and stored server-side.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | ✅ | — | 32-byte Fernet encryption key. Generate with: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `DATABASE_URL` | ✅ | — | PostgreSQL URL, e.g. `postgresql://user:pass@database:5432/kanbain` |
| `REDIS_URL` | ✅ | — | Redis URL, e.g. `redis://redis:6379/0` |
| `PLANNER` | — | `openai` | Set to `stub` to disable real LLM calls |
| `OPENAI_API_KEY` | — | — | Operator-level key; alternative to per-user key via Settings UI |
| `OPENAI_MODEL` | — | `gpt-4o` | Generation model |
| `OPENAI_ROUTING_MODEL` | — | `gpt-4o-mini` | Classification/critique model |
| `PLANNER_DELAY_SECONDS` | — | `0` | Artificial delay for stub mode (useful for testing progress UI) |
| `RAG_RESEARCH_TOKEN_BUDGET` | — | `2500` | Max tokens of RAG context per planning run |
| `PUBLIC_APP_URL` | — | `http://localhost:5173` | Public frontend origin. Used as the Google OAuth redirect base (`{PUBLIC_APP_URL}/api/auth/google/callback`). CORS defaults to this origin. When it is `https://…`, HTTP requests (except `/api/health`) redirect to HTTPS. |
| `CORS_ORIGINS` | — | `PUBLIC_APP_URL` | Comma-separated browser origins allowed to call the API directly. |
| `RATELIMIT_DEFAULT` | — | `120 per minute` | Per-IP cap on `/api/*` (`/api/health` is exempt). |
| `PLANNER_LIMIT` | — | `5 per hour` | Per-IP cap on creating a project that plans, and on `POST …/plan`. |
| `MAX_CONTENT_LENGTH` | — | `262144` | Max JSON body size in bytes. |
| `GOOGLE_CLIENT_ID` | — | — | Google OAuth client id. Leave empty to disable Google sign-in |
| `GOOGLE_CLIENT_SECRET` | — | — | Google OAuth client secret |
| `MAIL_PROVIDER` | — | `console` | `console` logs messages (local/dev), `smtp` uses SMTP, `resend` uses the Resend HTTP API |
| `MAIL_FROM` | — | — | From address for SMTP/Resend (for example `KanbAIn <noreply@example.com>`) |
| `SMTP_HOST` | — | — | Required when `MAIL_PROVIDER=smtp` |
| `SMTP_PORT` | — | `587` | `587` uses STARTTLS; `465` uses SSL |
| `SMTP_USER` | — | — | SMTP username |
| `SMTP_PASSWORD` | — | — | SMTP password |
| `RESEND_API_KEY` | — | — | Required when `MAIL_PROVIDER=resend` |

On first open, create an account at `/signup` (or sign in with Google). Email/password accounts must activate from the emailed link (`console` provider prints it in the backend log). Existing boards from before auth were backfilled into a `Migrated` org that no login can see — wipe the Postgres volume if you do not need them. Then go to **Settings** and enter your OpenAI API key.

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_WS_URL` | — | `ws://localhost:3000/ws` | WebSocket URL; set to `off` to disable |
| `MOCK_API` | — | — | In-memory board API for UI experiments. Does not include login. |
| `TRUST_PROXY` | — | — | Set to `1` only behind a reverse proxy that overwrites `X-Forwarded-For`. Otherwise the `/api` proxy ignores client-supplied forwarded IPs. |

---

## Development Setup

### Frontend Only (with mock API)

The mock API no longer includes accounts. Use Docker/backend for signup and Google sign-in.

```bash
cd frontend
npm install
MOCK_API=1 npm run dev
```

### Backend Only

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Set up Postgres and Redis (or use Docker for just those services)
docker compose up database redis -d

# Configure environment
cp .env.example .env
# Edit .env

# Run migrations and seed
flask db upgrade
flask seed

# Start Flask API
flask run --port 3000

# In another terminal, start the RQ worker
python -m app.worker
```

### Full Stack (without Docker)

Run the backend steps above, then:

```bash
cd frontend
npm install
npm run dev
```

---

## Running Tests

### Backend

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

Key test files:
- `tests/test_planner_graph.py` — LangGraph pipeline unit tests
- `tests/test_plan_job.py` — end-to-end job integration tests
- `tests/test_rag.py` — RAG retrieval tests
- `tests/test_eval.py` — plan quality evaluation
- `tests/test_load.py` — corpus loading tests

### Frontend

```bash
cd frontend
npm test          # unit tests
npm run storybook # component stories at http://localhost:6006
```

---

## Stub / Mock Mode

For development without OpenAI costs:

**Stub planner** — real Flask backend, fake LLM:
```bash
# backend/.env
PLANNER=stub
PLANNER_DELAY_SECONDS=3  # simulate planning time
```

**Mock API** — in-memory board data only, no login:
```bash
# frontend
MOCK_API=1 npm run dev
```

---

## CLI Reference

All CLI commands run inside the backend container or virtualenv:

```bash
# Apply database migrations
flask db upgrade

# Seed default project + wiki corpus
flask seed

# Generate a new Fernet key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Rotate the encryption key (re-encrypts stored API keys)
flask rotate-encryption-key --old-secret <old-passphrase>

# Wipe all stored API keys
flask invalidate-openai-keys --yes

# Create a new migration after changing models
flask db migrate -m "description of change"
```

---

## Docker Services

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Tail logs for a specific service
docker compose logs -f backend
docker compose logs -f worker

# Rebuild after code changes
docker compose build backend
docker compose up --force-recreate backend worker

# Stop everything
docker compose down

# Stop and wipe the database volume
docker compose down -v
```

---

## Project Structure

```
kanbain/
├── compose.yaml              # Docker Compose service definitions
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   ├── modules/          # Feature modules (Project, Task, Settings)
│   │   ├── libraries/        # Shared infrastructure (dnd, realtime, api)
│   │   └── uiKit/            # Design system components
│   ├── package.json
│   └── next.config.ts
│
└── backend/                  # Flask application
    ├── app/
    │   ├── planner/          # AI planning pipeline (LangGraph)
    │   ├── rag/              # RAG system (corpus, chunking, retrieval)
    │   ├── realtime/         # WebSocket event bus
    │   ├── models.py         # SQLAlchemy models
    │   ├── cli.py            # Flask CLI commands
    │   └── queue.py          # RQ job helpers
    ├── migrations/           # Alembic migration files
    ├── tests/                # Pytest test suite
    └── requirements.txt
```

---

## Common Issues

### `SECRET_KEY` not set
```
ValueError: SECRET_KEY must be set
```
Generate a key and add it to `backend/.env`:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### pgvector extension not found
```
ProgrammingError: type "vector" does not exist
```
Run migrations — they create the extension:
```bash
flask db upgrade
```

### Planning never completes (stuck on "planning")
Check the worker logs:
```bash
docker compose logs -f worker
```
Common causes: missing `OPENAI_API_KEY`, API rate limit, or invalid `DATABASE_URL` in worker config.

### WebSocket not connecting
The browser console will show `WebSocket connection failed`. Check:
- Flask backend is running on port 3000
- `NEXT_PUBLIC_WS_URL` is set correctly (or left unset for auto-detection)
- No firewall blocking the WebSocket port
