# KanbAIn frontend

Next.js App Router UI for the Flask Kanban API. The project list is a Server Component. Creating a project is a Server Action. The board is a client component (TanStack Query) hydrated with columns fetched on the server.

**Repository:** https://github.com/Hextar/kanbain

## Tech stack

- Next.js 16 (App Router, Server Components, Server Actions, React Compiler)
- React 19 + TypeScript
- Tailwind CSS 4
- [TanStack Query](https://tanstack.com/query) for board mutations
- [Lucide](https://lucide.dev/) for icons

## Getting started

### Mock API (no Docker)

In-memory projects/columns/tasks for Storybook and board UI experiments. It does **not** include login. Use the real API below to sign in.

```bash
npm install
npm run dev:mock
```

### Real API

Flask, Redis, Postgres, and the planner worker must be running (`docker compose up --build database backend worker` from the repo root).

```bash
npm install
cp .env.example .env.local   # API_URL=http://localhost:3000
npm run dev
```

Open the URL Next prints. Flask already uses port 3000, so Next will typically choose **3001**. `/api` is proxied to Flask. The browser also opens `ws://localhost:3000/ws` (override with `NEXT_PUBLIC_WS_URL`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js against Flask (`API_URL`) |
| `npm run dev:mock` | Next.js with an in-memory mock API |
| `npm run build` | Production build |
| `npm run start` | Production server on port 8080 |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Routes

| Path | What it is |
|------|------------|
| `/` | Project list (RSC) |
| `/login` `/signup` | Sign in / create account |
| `/forgot-password` `/reset-password` `/activate` | Password reset and email confirmation |
| `/project/[projectId]` | Kanban board for that project |

## Project structure

```
src/
  app/                 # App Router: layout, pages, /api proxy-or-mock
  api/                 # Flask client + in-memory mock store
  Project/             # list UI, server actions, project fetch
  Task/                # board UI + column/task client API
  uiKit/               # shared UI primitives
```
