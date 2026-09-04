# Frontend Overview

The frontend is a **Next.js 16** application using the App Router, React 19, and Tailwind CSS v4. It is designed to render fast (Server Components for initial data), stay reactive (TanStack Query + WebSocket), and be fully keyboard/mouse accessible.

---

## Tech Stack

| Layer | Library | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | All pages under `app/` use `force-dynamic` |
| UI library | React 19.2 | With React Compiler (`babel-plugin-react-compiler`) for auto-memoization |
| Styling | Tailwind CSS v4 | `tailwind-merge` for conditional class composition |
| Server state | `@tanstack/react-query` v5 | 30s stale time; query cache is the single source of truth for remote data |
| Icons | `lucide-react` | Tree-shaken via `optimizePackageImports` in Next.js config |
| Force graph | D3 (`d3-force`, `d3-selection`, `d3-transition`, `d3-ease`) | Used for the Flow (dependency graph) view |
| Date formatting | `date-fns` | Locale-aware date display |
| Component dev | Storybook 10 (`@storybook/nextjs-vite`) | Stories live alongside components |

**Notable absence**: No external drag-and-drop library. KanbAIn ships its own HTML5 DnD system — see [Drag and Drop](Frontend-Drag-and-Drop).

---

## Directory Structure

```
frontend/src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (QueryClient, toasts)
│   ├── (auth)/login|signup|forgot-password|reset-password|activate
│   ├── (app)/                  # Authenticated shell
│   │   ├── page.tsx            # Project list
│   │   └── project/[projectId]/
│   └── api/                    # Next.js API route proxies to Flask (forwards cookies)
│
├── middleware.ts               # Redirects anonymous visitors to /login
│
├── modules/                    # Feature modules
│   ├── Auth/                   # Session, login/signup, user menu
│   ├── Project/                # Project CRUD, wizard, plan status
│   ├── Task/                   # Kanban board, task dialogs, flow view
│   └── Settings/               # OpenAI API key management
│
├── libraries/                  # Shared infrastructure
│   ├── dnd/                    # Custom drag-and-drop system
│   ├── realtime/               # WebSocket + event handling
│   └── api/                    # Typed API client helpers
│
└── uiKit/                      # Design system components
```

---

## App Router Pages

### `/login` and `/signup`

Unauthenticated. Email/password form plus a top-level link to `/api/auth/google` so the browser follows OAuth redirects. Google is not a `fetch` call. Signup sends an activation email and does not create a session until `/activate`. Login has a Forgot password link.

### `/forgot-password`, `/reset-password`, `/activate`

Public token/email flows for recovering a password and confirming a new account.

### `/` — Project List

A Server Component that fetches all projects server-side and renders the project grid. Clicking a project navigates to the workspace.

### `/project/[projectId]` — Project Workspace

A Server Component that **prefetches both the project metadata and the board data in parallel** before streaming HTML. The board renders immediately without a client-side loading state on first visit.

The workspace shows one of two states depending on `project.planStatus`:
- **Planning in progress** → `PlanProgress` component with animated phases (classifying, retrieving, generating…)
- **Ready / Failed** → `KanbanBoard` with full task management

---

## Key Modules

### `modules/Project/`

| File | Purpose |
|---|---|
| `NewProjectWizard.tsx` | Multi-step wizard collecting project brief, team, deadline, methodology, and effort level |
| `ProjectWorkspace.tsx` | Top-level shell; switches between planning progress and kanban board |
| `components/PlanProgress.tsx` | Animated progress UI driven by realtime `plan.updated` events |
| `helpers/planProgress.ts` | Maps `plan_phase` strings to human-readable labels and progress percentages |
| `helpers/projectJson.ts` | Serialization helpers for project data |
| `types/Project.ts` | TypeScript types for all project-related data |

### `modules/Task/`

| File | Purpose |
|---|---|
| `KanbanBoard.tsx` | Main board shell: columns, task creation, filter/view state, column-level DnD |
| `components/TaskColumn.tsx` | Individual column: task-level DnD, ordering, column header edit |
| `components/TaskDetailDialog.tsx` | Full task detail panel (title, description, acceptance criteria, estimates, dependencies) |
| `FlowView/` | D3 force-directed graph showing task dependency relationships |
| `helpers/boardFilter.ts` | Filter clause parsing and `matchingTaskIds()` logic |
| `helpers/taskOrder.ts` | Fractional indexing for task ordering within columns |

### `modules/Settings/`

Settings page where users enter their OpenAI API key. The key is sent to Flask which encrypts and stores it — it is never returned to the browser after saving.

---

## State Management

KanbAIn uses **no global state library** (no Redux, no Zustand). State is split into three tiers:

### 1. Server State — TanStack Query

All remote data (projects, columns, tasks, milestones, members, settings) lives in the TanStack Query cache. Components subscribe to specific query keys and re-render only when their data changes.

Realtime WebSocket events patch the cache directly via `queryClient.setQueryData()` or `queryClient.invalidateQueries()` — see [Realtime Updates](Frontend-Realtime).

### 2. URL State — Search Params

The board persists navigable state in the URL so deep links and browser back/forward work correctly:

| Param | Values | Effect |
|---|---|---|
| `?view=` | `board` \| `flow` | Switches between Kanban and D3 flow view |
| `?task=` | task ID | Opens task detail dialog |
| `?filter=` | serialized filter clauses | Active filter configuration |
| `?cluster=` | node ID | Focused node in flow view |

### 3. Local UI State — `useState`

Transient UI state (draft column titles, tooltip visibility, dialog open/close) uses plain React state scoped to the component that needs it.

---

## UI Kit (`uiKit/`)

KanbAIn ships a small, bespoke design system:

| Component | Purpose |
|---|---|
| `Button.tsx` | Primary/secondary/ghost button variants |
| `Input.tsx` | Text input with label and error state |
| `Dialog.tsx` | Modal dialog with focus trap |
| `ContextMenu.tsx` | Right-click / trigger context menu |
| `ToastHost.tsx` | Toast notification container |
| `CanvasDots.tsx` | Animated dot grid background (used on empty states) |
| `FlipItem.tsx` | FLIP animation wrapper for list reordering |

---

## Rendering Strategy

- **Server Components** handle data-heavy layouts (project list, initial board render). They can `await` data without waterfalls because Next.js parallelizes sibling component fetches.
- **Client Components** (`'use client'`) handle interactivity: the Kanban board, drag-and-drop, realtime subscriptions, and dialogs.
- **React Compiler** is enabled, so most `useMemo` / `useCallback` optimization is handled automatically by the compiler.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL (auto-detects port 3000 if unset); set to `"off"` to disable |
| `MOCK_API` | In-memory board API for UI experiments (no auth) |
