# task-dashboard

A React 19 kanban dashboard built with Vite and TypeScript. Task data lives in the `Task` feature module and is loaded through TanStack Query over `fetch('/api/tasks')`. In development, [MSW](https://mswjs.io/) intercepts those requests with an in-memory mock (refresh clears tasks). `npm run dev:prod` skips MSW and sends `/api` to the Flask backend (Vite proxies to `http://localhost:3000`).

**Repository:** https://github.com/Hextar/kanban-dashboard

## Features

- Kanban board with user-named columns
- Add columns and tasks over HTTP (`/api/columns`, `/api/tasks`), mocked with MSW in development

## Tech stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- [TanStack Query](https://tanstack.com/query) for task data
- [Lucide](https://lucide.dev/) for icons
- [MSW](https://mswjs.io/) to mock `/api` in development
- React Compiler enabled via Babel plugin

## Getting started

```bash
npm install
npm run dev          # MSW mocks
# npm run dev:prod   # real Flask API (see below)
```

Open http://localhost:5173 (or the port shown in the terminal).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with MSW mocks |
| `npm run dev:prod` | Start dev server against the real Flask API |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Project structure

```
src/
  App.tsx              # composes feature modules
  main.tsx             # app shell (QueryClientProvider)
  uiKit/               # shared UI primitives
  Task/                # task board feature module
    index.ts           # public API
    KanbanBoard.tsx
    components/        # board UI
    api/               # fetch client + MSW handlers
    hooks/             # TanStack Query hooks (CRUD)
    types/
    helpers/           # JSON <-> Task mapping
  mocks/               # MSW worker (starts in dev)
```

In development, MSW intercepts `/api/*` before Vite unless mocks are disabled. Vite proxies `/api` to `http://localhost:3000`.

To develop against a real backend, start Postgres and Flask from the repo root, then run Vite with mocks off:

```bash
docker compose up --build database backend
npm run dev:prod
```

That is the usual path for frontend work against real data. Run Flask on the host only when you are changing the API (see [backend/README.md](../backend/README.md)).

## Query keys

`Task/api/taskKeys.ts` names TanStack Query cache entries. They are cache addresses, not fields on `Task`.

| Key | Cache entry | CRUD |
|---|---|---|
| `taskKeys.list(filters?)` | task list | Read collection (`columnId` filter) |
| `taskKeys.detail(id)` | one task (`Task['id']`) | Read / Update |
| `taskKeys.lists()` | prefix for every list | invalidate after Create / Update / Delete |
| `taskKeys.all` | prefix for every task query | invalidate everything |
| `columnKeys.list()` | column list | Read / Create columns |
