# Frontend Overview

The frontend is a **Next.js 16** application using the App Router, React 19, and Tailwind CSS v4. It is designed to render fast (Server Components for initial data), stay reactive (TanStack Query + WebSocket), and be fully keyboard/mouse accessible.

---

## Tech Stack

| Layer | Library | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | All pages under `app/` use `force-dynamic` |
| UI library | React 19.2 | With React Compiler (`babel-plugin-react-compiler`) for auto-memoization |
| Styling | Tailwind CSS v4 | `tailwind-merge` for conditional class composition |
| Client prefs | Redux Toolkit | `src/store` (`configureStore` + `prefs` slice); persisted to `localStorage` + cookie |
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
│   ├── layout.tsx              # Root layout (Redux prefs, boot script)
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
│   ├── About/                  # About dialog copy, privacy, auth footer
│   ├── Project/                # Project CRUD, wizard, plan status
│   ├── Task/                   # Kanban board, task dialogs, flow view
│   └── Settings/               # OpenAI API key management
│
├── store/                      # Redux Toolkit (`makeStore`, `prefs` slice)
├── libraries/                  # Shared client infrastructure (`@libraries/…`)
│   ├── dnd/                    # Custom HTML5 drag-and-drop
│   ├── realtime/               # WebSocket + TanStack Query cache patches
│   ├── toast/                  # In-memory toast list (`showToast`)
│   ├── pointerLight/           # Pointer-follow CSS vars for dotted canvases
│   └── particles/              # Spawn / shatter / celebrate overlay FX
│
├── api/                        # `API_URL`, mock board (`MOCK_API=1`)
└── uiKit/                      # Design system components
```

---

## Libraries (`libraries/`)

In-house modules, not npm packages. Import as `@libraries/…`.

| Folder | What it does |
|---|---|
| `dnd/` | HTML5 drag-and-drop for columns and cards. Details: [Drag and Drop](Frontend-Drag-and-Drop). |
| `realtime/` | WebSocket session, reconnect, and `applyRealtimeMessage()` into the Query cache. Details: [Realtime Updates](Frontend-Realtime). |
| `toast/` | Tiny subscribe/get store (`showToast`). `ToastHost` in `uiKit/` is the only subscriber. |
| `pointerLight/` | One window `pointermove` listener. Writes `--light-nx` / `--light-ny` on `:root` and `--lantern-x` / `--lantern-y` on registered canvases. `CanvasDots` calls `attachCanvas` / `detachCanvas`. Fine pointer + hover only; no-op when `prefers-reduced-motion`. |
| `particles/` | Full-screen overlay (`#fx-root`) for board FX. `markSpawn` / `consumeSpawn` fade a new card in; `shatter` / `shatterByAttr` clone-and-burst a deleted card; `markCelebrate` / `consumeCelebrate` confetti when work lands in the last column. All no-ops under reduced motion. |

HTTP to Flask is `src/api/` (`env.ts`, `mockDb.ts`) plus per-module `modules/*/api/`, not a `libraries/api` folder.

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
| `components/FlipItem.tsx` | FLIP animation wrapper for column and nested-task reorder |

### `modules/Settings/`

Settings dialog is **API key** (OpenAI). Theme and language are switched from the account menu (and language also from the auth-screen footer). The key is sent to Flask which encrypts and stores it — it is never returned to the browser after saving.

### `modules/About/`

About dialog (developer bio, short privacy note, GitHub + LinkedIn). Opened from the account menu, or from About / Privacy in the auth-screen footer. Static chrome copy is translated via `src/i18n/`; developer name and profile URLs stay in `site.ts`.

---

## State Management

State is split into four tiers. Redux holds **client prefs only** (theme and locale). Server data stays in TanStack Query; board view/filter stays in the URL.

### 1. Client prefs — Redux Toolkit

`src/store` is the Redux Toolkit store (`configureStore` via `makeStore`) provided from the root layout. The `prefs` slice stores `{ theme, locale, density }`. The account menu writes `theme` (`dark` | `light` | `system`) and `locale` (`en` | `it` | `fr` | `es` | `de`). `src/i18n/` holds message catalogs; `useT()` reads locale from Redux and interpolates `{name}` tokens. Locale also sets `<html lang>`. User-generated content (project names, task titles, planner output) and Flask error messages stay untranslated. Typed board-filter queries stay English. A blocking `/prefs-boot.js` script applies `data-theme` on `<html>` before paint so the stored theme does not flash. Prefs persist to `localStorage` key `prefs:v1` and cookie `kanbain_prefs`.

Do not put projects, tasks, or session data in Redux.

### 2. Server State — TanStack Query

All remote data (projects, columns, tasks, milestones, members, settings) lives in the TanStack Query cache. Components subscribe to specific query keys and re-render only when their data changes.

Realtime WebSocket events patch the cache directly via `queryClient.setQueryData()` or `queryClient.invalidateQueries()` — see [Realtime Updates](Frontend-Realtime).

### 3. URL State — Search Params

The board persists navigable state in the URL so deep links and browser back/forward work correctly:

| Param | Values | Effect |
|---|---|---|
| `?view=` | `board` \| `flow` | Switches between Kanban and D3 flow view |
| `?task=` | task ID | Opens task detail dialog |
| `?filter=` | serialized filter clauses | Active filter configuration |
| `?cluster=` | node ID | Focused node in flow view |

### 4. Local UI State — `useState`

Transient UI state (draft column titles, tooltip visibility, dialog open/close) uses plain React state scoped to the component that needs it.

---

## UI Kit (`uiKit/`)

Bespoke primitives imported as `@uiKit/…`. No Radix or shadcn. Stories sit next to each component; `Overview.stories.tsx` is the full gallery (`npm run storybook` in `frontend/`).

Labels and errors live on `Field`, not on `Input`. Column/task reorder FLIP is `modules/Task/components/FlipItem.tsx`, not the kit.

### Buttons and forms

| Component | Purpose |
|---|---|
| `Button.tsx` | Filled / outline / ghost; primary / secondary / danger |
| `IconButton.tsx` | Icon-only button (same kinds and variants) |
| `ButtonGroup.tsx` | Segmented control / tabs (`ButtonGroupItem`) |
| `Field.tsx` | Label + control layout; `FormMessage` for errors |
| `Input.tsx` | Text input |
| `Select.tsx` | Native `<select>` with kit chrome |
| `Textarea.tsx` | Textarea; optional `autoGrow` |
| `RadioButton.tsx` | Styled radio |

### Feedback

| Component | Purpose |
|---|---|
| `Badge.tsx` | Status / count pill |
| `Chip.tsx` | Dismissible filter chip |
| `Callout.tsx` | Inline ok / warn / danger message |
| `ProgressBar.tsx` | Linear progress |
| `ProgressRing.tsx` | Circular completion (board header) |
| `Skeleton.tsx` | Loading placeholder |
| `EmptyState.tsx` | Page / panel / compact empty layouts |
| `ToastHost.tsx` | Popover toast stack; messages via `@libraries/toast` |

### Surfaces

| Component | Purpose |
|---|---|
| `Card.tsx` | Project / task card surface |
| `CanvasSurface.tsx` | Static dotted canvas (auth layout) |
| `CanvasDots.tsx` | Same canvas plus pointer-follow light (boards, home) |
| `LightOrb.tsx` | Decorative blur orb (dialogs, chrome) |
| `ColorSwatch.tsx` | Column-color picker swatch |
| `Avatar.tsx` | Initials avatar and `AvatarStack` |

### Overlays

| Component | Purpose |
|---|---|
| `Dialog.tsx` | Modal with focus trap; `DialogPanel` sections |
| `ConfirmDialog.tsx` | Confirm / cancel wrapper around `Dialog` |
| `ContextMenu.tsx` | Right-click / trigger menu |
| `PopoverPanel.tsx` | Anchored popover (`Popover` + panel) |
| `Tooltip.tsx` | Hover / focus tooltip |
| `HoverPreview.tsx` | Delayed hover card; `AnchoredHoverPreview` for the flow graph |

### Chrome and motion

| Component | Purpose |
|---|---|
| `AppHeader.tsx` | App chrome; `HeaderProvider` / `HeaderSlot` for page-injected center and trailing |
| `CollapsibleSlot.tsx` | Height-animated show/hide (nested cards) |

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
