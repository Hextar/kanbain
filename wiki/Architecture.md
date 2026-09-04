# Architecture Overview

KanbAIn is a full-stack web application composed of five Docker services that communicate over HTTP, WebSocket, and Redis pub/sub.

---

## Services

| Service | Tech | Port | Role |
|---|---|---|---|
| `frontend` | Next.js 16 | 8080 | UI — App Router, Server Components, client-side interactivity |
| `backend` | Flask (Python) | 3000 | REST API + WebSocket server |
| `worker` | Same image as backend | — | RQ background job runner (AI planner) |
| `redis` | redis:7-alpine | 6379 | Job queue broker + pub/sub channel for realtime events |
| `database` | pgvector/pgvector:pg15 | 5432 | PostgreSQL 15 with vector search extension |

All services are declared in `compose.yaml` at the repo root.

---

## Communication Patterns

### 1. Browser → Backend (REST)

The Next.js frontend makes JSON API calls to Flask:

- **Server Components** call Flask directly (server-to-server, same Docker network).
- **Client Components** go through a Next.js API proxy at `/api/*`, which forwards requests to Flask and injects auth headers.
- All API responses use **camelCase** JSON.

### 2. Async Planning (RQ)

When a project is created or re-planned:

```
POST /api/projects
       │
       ▼
Flask creates Project row (plan_status = "planning")
       │
       ▼
enqueue_plan(project_id) → Redis "kanbain" queue
       │
       ▼
RQ Worker picks up job
       │
       ▼
LangGraph pipeline runs (can take 10–120s depending on effort)
       │
       ▼
apply_plan() writes tasks to Postgres
       │
       ▼
publish_project_event() → Redis pub/sub
```

The worker runs in a separate Docker container using the same codebase as the backend. Job timeouts are derived from the `thought_effort` level (longer for `high`/`max`).

### 3. Backend → Browser (Realtime)

```
Redis pub/sub channel: kanbain:room:project:{id}
              │
              ▼
      Flask WebSocket server (ws://host:3000/ws)
              │
         broadcasts to all
         subscribed browser tabs
              │
              ▼
   applyRealtimeMessage() in Next.js
              │
    patches TanStack Query cache
```

Clients subscribe to their project's channel when they open a project workspace. A 2-second HTTP polling fallback activates when the WebSocket connection is down.

**Deduplication**: Every mutating HTTP request includes an `X-Realtime-Client` header with the tab's UUID. When the backend echoes back a WebSocket event, it includes the `origin` client ID. The receiving tab skips applying events it originated to avoid double-updates.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│  Next.js App Router (port 8080)                     │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Server       │  │ Client       │                 │
│  │ Components   │  │ Components   │                 │
│  │ (SSR fetch)  │  │ (TanStack Q) │◄── WS events   │
│  └──────┬───────┘  └──────┬───────┘                 │
└─────────┼────────────────-┼───────────────────────--┘
          │ HTTP             │ HTTP + WS
          ▼                  ▼
┌─────────────────────────────────────────────────────┐
│                Flask Backend (port 3000)             │
│  REST API  │  WebSocket server  │  pub/sub listener │
└────────────┼────────────────────┼────────────────---┘
             │ SQLAlchemy         │ Redis
             ▼                    ▼
       ┌──────────┐        ┌──────────────┐
       │ Postgres │        │    Redis     │
       │ (port    │        │  (port 6379) │
       │  5432)   │        │  queue+pub   │
       └──────────┘        └──────┬───────┘
                                  │ job dequeue
                                  ▼
                         ┌─────────────────┐
                         │   RQ Worker     │
                         │  LangGraph      │
                         │  AI Pipeline    │
                         └─────────────────┘
```

---

## Key Design Decisions

### Why RQ + Worker?

AI planning calls OpenAI APIs and can take 30–120 seconds. Synchronous HTTP would time out. RQ lets the API return immediately with `plan_status = "planning"` while the worker does the heavy lifting in the background.

### Why pgvector?

The RAG system stores OpenAI embeddings alongside wiki chunks. pgvector enables efficient cosine similarity search without a separate vector database, keeping the stack simple.

### Why custom WebSocket instead of SSE?

The backend uses a persistent WebSocket connection so it can push events to multiple browser tabs reliably. Server-Sent Events are one-directional and don't support the channel subscription model used here.

### Why Next.js App Router?

Server Components allow the initial project page load to prefetch the project and board data server-side in parallel, reducing Time to Interactive. Client Components handle interactive features (board, drag-and-drop, realtime updates).
