# KanbAIn Wiki

Welcome to the **KanbAIn** documentation. KanbAIn is an AI-first Kanban board where you describe a project and the AI planner automatically populates a structured board — then re-plans when team composition or deadlines change.

---

## Pages

### 🏗️ Architecture
- **[Architecture Overview](Architecture)** — system diagram, services, and communication patterns

### 🖥️ Frontend
- **[Frontend Overview](Frontend)** — tech stack, app structure, state management, and key modules
- **[Drag and Drop](Frontend-Drag-and-Drop)** — how the custom HTML5 DnD system works
- **[Realtime Updates](Frontend-Realtime)** — WebSocket connection, event handling, and cache patching

### ⚙️ Backend
- **[Backend Overview](Backend)** — Flask API, REST endpoints, queue system, and WebSocket server
- **[AI Planner](Backend-AI-Planner)** — LangGraph state machine, LLM nodes, effort levels, and plan application
- **[RAG System](Backend-RAG)** — retrieval-augmented generation: corpus, chunking, embedding, and hybrid retrieval

### 🗄️ Data
- **[Data Models](Data-Models)** — database schema for Projects, Tasks, WikiChunks, and all related models

### 🚀 Setup
- **[Getting Started](Getting-Started)** — local development setup, environment variables, and CLI commands

---

## Quick Concept Map

```
User fills wizard
       │
       ▼
Flask API  ──enqueue──►  RQ Worker
       │                     │
       │                 LangGraph
       │                 ┌───────────────────────────────┐
       │                 │  ground → decompose → generate │
       │                 │         ↑                      │
       │                 │    critique ← revise           │
       │                 └───────────────────────────────-┘
       │                     │
       │                 apply_plan → Postgres
       │                     │
       │              Redis pub/sub
       │                     │
       ▼                     ▼
  Next.js UI ◄──── WebSocket ──── Flask WS server
  (TanStack Query cache patched live)
```

## Key Terms

| Term | Meaning |
|---|---|
| **Plan** | The AI-generated board structure (columns + tasks) |
| **Thought effort** | `low` / `medium` / `high` / `max` — controls how many LLM passes the planner makes |
| **RAG** | Retrieval-Augmented Generation — the system that fetches relevant PM/domain knowledge before generating |
| **RQ** | Redis Queue — background job system that runs the planner asynchronously |
| **LangGraph** | Python library for building stateful LLM pipelines as graphs |
| **WikiChunk** | A piece of indexed knowledge (from the bundled corpus or scraped web pages) |
| **pgvector** | PostgreSQL extension enabling vector similarity search on embeddings |
| **MMR** | Maximal Marginal Relevance — reranking algorithm that balances relevance with diversity |
| **X-Realtime-Client** | Header sent with every mutating request so the server can echo back events without double-applying them |
