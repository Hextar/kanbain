# Backend Overview

The backend is a **Flask** (Python) application that serves the REST API, manages the WebSocket server, and orchestrates background AI planning jobs via RQ.

---

## Tech Stack

| Layer | Library | Notes |
|---|---|---|
| Framework | Flask | Application factory pattern |
| ORM | SQLAlchemy (Flask-SQLAlchemy) | Typed `Mapped`/`mapped_column` declarations |
| Migrations | Flask-Migrate (Alembic) | Migration files in `backend/migrations/versions/` |
| Queue | RQ (Redis Queue) | Single queue named `"kanbain"` |
| Realtime | Custom WebSocket + Redis pub/sub | `backend/app/realtime/bus.py` |
| AI | OpenAI Python SDK + LangGraph | Planner pipeline |
| Embeddings | OpenAI `text-embedding-*` | Stored as JSON in `WikiChunk.embedding` |
| Security | Fernet (cryptography), argon2id, Authlib | OpenAI key encryption, passwords, Google OAuth |
| Mail | Console / SMTP / Resend | Account activation and password reset |

---

## Directory Structure

```
backend/app/
├── __init__.py          # Application factory (create_app)
├── config.py            # Config from environment variables
├── mail.py              # Email providers (console, SMTP, Resend)
├── models.py            # SQLAlchemy models
├── cli.py               # Flask CLI commands (seed, rotate-key, etc.)
├── queue.py             # RQ job enqueueing helpers
│
├── planner/             # AI planning pipeline
│   ├── graph.py         # LangGraph state machine definition
│   ├── nodes.py         # Individual graph nodes (ground, generate, critique…)
│   ├── apply.py         # Writes LLM output to Postgres
│   ├── effort.py        # Effort level configuration
│   ├── llm.py           # OpenAI API wrappers
│   ├── llm_schema.py    # JSON schemas for structured LLM outputs
│   ├── schema.py        # Pydantic models for plan data
│   ├── job.py           # RQ job entrypoint
│   └── openai_planner.py# High-level planner interface
│
├── rag/                 # Retrieval-Augmented Generation
│   ├── retrieve.py      # Hybrid retrieval (vector + FTS + RRF + MMR)
│   ├── embed.py         # Embedding generation
│   ├── chunk.py         # Markdown chunking
│   ├── ingest.py        # URL ingestion
│   ├── scrape.py        # Web scraping
│   ├── classify.py      # Domain classification
│   ├── domains.py       # Known domain slugs and aliases
│   ├── seed.py          # Corpus seeding
│   ├── load.py          # File loading helpers
│   ├── models.py        # WikiSource / WikiChunk models
│   └── corpus/          # Bundled markdown knowledge base
│
└── realtime/
    └── bus.py           # Redis pub/sub event publisher
```

---

## REST API

All responses use **camelCase JSON**. All mutating endpoints publish a `board.updated` or `plan.updated` WebSocket event after committing to the database.

`GET /api/health` and `/api/auth/*` are public (except `GET /api/auth/me` and `GET /api/auth/ws-ticket`, which require a session). Every other `/api/*` route requires the `kanbain_session` cookie. Missing or invalid sessions return `401 { "message": "Unauthorized" }`. Cross-tenant reads return `404` so existence is not leaked.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Email/password signup; creates a personal organization; sends activation email (no session until activated) |
| `POST` | `/api/auth/login` | Email/password login (403 `unverified` until the account is activated) |
| `POST` | `/api/auth/activate` | Confirm email from the signed token; sets session |
| `POST` | `/api/auth/resend-activation` | Re-send the activation email (always a generic 200) |
| `POST` | `/api/auth/forgot-password` | Send a reset (or activation) email (always a generic 200) |
| `POST` | `/api/auth/reset-password` | Set a new password from the signed token; sets session |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Current user + organization |
| `GET` | `/api/auth/ws-ticket` | Short-lived WebSocket ticket (~60s) |
| `GET` | `/api/auth/google` | Start Google OAuth (browser redirect) |
| `GET` | `/api/auth/google/callback` | Google OAuth callback; sets session and redirects home |

Google sign-in marks the email verified and **merges into an existing email+password account** with the same address (password login still works). Register, login, forgot-password, resend-activation, and Google OAuth are rate-limited per client IP (`429` when exceeded). `MAIL_PROVIDER` is `console` (logs the message, default), `smtp`, or `resend`. Failed activation mail on register rolls the account back.

### Settings

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/settings` | Returns settings (OpenAI key presence, model preference). **Never returns the key itself.** |
| `PUT` | `/api/settings` | Saves the OpenAI API key (encrypted via Fernet before storage) |

### Projects

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create project → enqueue planner |
| `GET` | `/api/projects/:id` | Get project with plan status |
| `PUT` | `/api/projects/:id` | Update project metadata |
| `DELETE` | `/api/projects/:id` | Delete project and all board data |
| `POST` | `/api/projects/:id/plan` | Re-trigger planning (for `failed`/`ready` projects) |

### Board

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/:id/board` | Get all columns + tasks for a project |
| `GET/POST` | `/api/projects/:id/columns` | List / create columns |
| `PUT/DELETE` | `/api/columns/:id` | Update / delete a column |
| `GET/POST` | `/api/projects/:id/tasks` | List / create tasks |
| `GET/PUT/DELETE` | `/api/tasks/:id` | Get / update / delete a task |

### Members & Milestones

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/projects/:id/members` | List / add project members |
| `PUT/DELETE` | `/api/members/:id` | Update / remove a member |
| `GET/POST` | `/api/projects/:id/milestones` | List / create milestones |
| `PUT/DELETE` | `/api/milestones/:id` | Update / delete a milestone |

### WebSocket

| Path | Description |
|---|---|
| `ws://host:3000/ws?ticket=` | Persistent WebSocket. Connect with a ticket from `GET /api/auth/ws-ticket`. Send `{"type":"subscribe","projectId":"..."}` for projects in the ticket's organization. |

---

## Queue System (`queue.py`)

RQ (Redis Queue) is used for long-running background work. KanbAIn uses a single queue named `"kanbain"`.

### `enqueue_plan(project_id)`

Pushes a `plan_project` job to the queue. The timeout is derived from `thought_effort`:

| Effort | Job timeout |
|---|---|
| `low` | ~60s |
| `medium` | ~120s |
| `high` | ~240s |
| `max` | ~480s |

### `enqueue_wiki_warm(domain_slug, urls)`

Pushes a background job to scrape and index external URLs into the wiki corpus. Used to warm the RAG cache for a domain. Timeout: 180s.

### Worker

The RQ worker is a separate Docker service running:

```bash
python -m app.worker
```

It listens on the `"kanbain"` queue and processes jobs one at a time. Failed jobs are logged and the project's `plan_status` is set to `"failed"` with an error message.

---

## Realtime Event Bus (`realtime/bus.py`)

`publish_project_event(project_id, event, payload)` is the single entry point for publishing realtime events. It:

1. Reads `X-Realtime-Client` from the current Flask request context (if available) to populate `origin`.
2. Constructs a versioned JSON envelope: `{ event, projectId, origin, payload, ts }`.
3. Publishes to `kanbain:room:project:{project_id}` Redis channel.
4. The Flask WebSocket server (subscribed to all channels) fans the message out to all connected browser tabs that have subscribed to that room.

---

## Security

### OpenAI API Key Encryption

User-provided OpenAI keys are encrypted before storage:

1. `PUT /api/settings` receives the plaintext key.
2. Flask encrypts it with `Fernet(SECRET_KEY)` — symmetric encryption using a 32-byte key derived from `SECRET_KEY` in the environment.
3. The ciphertext is stored in Redis (not Postgres).
4. On every LLM call, the worker decrypts the key at runtime.
5. `GET /api/settings` returns only `{ hasKey: true }` — the plaintext key never leaves the server after being saved.

### Key Rotation

```bash
flask rotate-encryption-key --old-secret <old-passphrase>
```

Re-encrypts the stored key under the new `SECRET_KEY` without requiring the user to re-enter it.

```bash
flask invalidate-openai-keys --yes
```

Wipes all stored keys from Redis. Users must re-enter their key after this.

---

## CLI Commands (`cli.py`)

| Command | Description |
|---|---|
| `flask seed` | Seeds default project, default board columns, and the wiki corpus |
| `flask db upgrade` | Runs Alembic migrations (creates pgvector extension, wiki tables, etc.) |
| `flask rotate-encryption-key --old-secret <passphrase>` | Re-encrypts stored OpenAI key |
| `flask invalidate-openai-keys --yes` | Wipes all stored OpenAI keys |

---

## Configuration (`config.py`)

| Env Var | Default | Required | Purpose |
|---|---|---|---|
| `SECRET_KEY` | — | ✅ | Fernet encryption key for API key storage |
| `DATABASE_URL` | — | ✅ | PostgreSQL connection string |
| `REDIS_URL` | — | ✅ | Redis connection string |
| `PLANNER` | `openai` | — | `openai` for real LLM; `stub` for deterministic mock |
| `OPENAI_API_KEY` | — | — | Operator-level key (alternative to Settings UI) |
| `OPENAI_MODEL` | `gpt-4o` | — | Generation model |
| `OPENAI_ROUTING_MODEL` | `gpt-4o-mini` | — | Classify/critique model |
| `PLANNER_DELAY_SECONDS` | `0` | — | Artificial delay for stub mode |
| `RAG_RESEARCH_TOKEN_BUDGET` | `2500` | — | Max tokens of RAG context fed to planner |
