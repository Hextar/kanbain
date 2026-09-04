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

On first open, go to **Settings** and enter your OpenAI API key. The key is encrypted and stored server-side.

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

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_WS_URL` | — | `ws://localhost:3000/ws` | WebSocket URL; set to `off` to disable |
| `MOCK_API` | — | — | Set to `1` to use in-memory mock API (no backend needed) |

---

## Development Setup

### Frontend Only (with mock API)

```bash
cd frontend
npm install
MOCK_API=1 npm run dev
# Open http://localhost:8080
```

No backend or Docker needed. Uses an in-memory mock API with pre-seeded data.

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

**Mock API** — no backend at all:
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
