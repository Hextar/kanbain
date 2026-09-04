# Drag and Drop

KanbAIn ships its own drag-and-drop system built on top of the browser's native **HTML5 Drag and Drop API**. There is no third-party DnD library. All source files live in `frontend/src/libraries/dnd/`.

---

## Why a Custom Implementation?

- **No extra bundle weight** — native browser APIs, zero JS overhead for the core mechanics
- **Full control** over ghost rendering, auto-scroll behaviour, and MIME-type payloads
- **Composable hooks** — any component can opt into dragging or dropping independently

---

## File Map

```
frontend/src/libraries/dnd/
├── useHtml5Drag.ts      # Hook: makes an element draggable
├── useHtml5Drop.ts      # Hook: makes an element a drop zone
├── html5DnD.ts          # Low-level helpers (data transfer, source marking)
├── liveGhost.ts         # Floating cursor-following clone during drag
└── autoScroll.ts        # Edge-triggered scrolling while dragging
```

---

## Core Concepts

### Typed MIME Payloads

Each draggable type uses a distinct MIME type so drag sources and drop targets can confirm they're compatible:

| MIME type | Used for |
|---|---|
| `TASK_DRAG_MIME` | Dragging a task card between / within columns |
| `COLUMN_DRAG_MIME` | Dragging a column to reorder the board |

The payload (task ID, column ID, etc.) is serialized into `dataTransfer` via `setDragData()` in `html5DnD.ts`.

### `useHtml5Drag`

Wraps the native `draggable` attribute and drag event handlers. Responsibilities:

1. Sets `draggable="true"` on the target element.
2. On `dragstart`: calls `setDragData()` to write the typed payload into `dataTransfer`; calls `markDragSource()` to add a CSS class so the original element can be styled as "ghost".
3. Activates the **live ghost** (see below).
4. On `dragend`: tears down the ghost and removes source styling.

### `useHtml5Drop`

Attaches drop zone behaviour to an element. Responsibilities:

1. Listens to `dragover`, `dragenter`, `dragleave`, `drop`.
2. Reads the MIME type to confirm the payload is compatible.
3. In **sortable mode**: calculates the insertion index by comparing the cursor Y-position against the midpoints of existing children — this produces smooth in-place reordering without extra state.
4. Fires the `onDrop(payload, insertionIndex)` callback which the consuming component uses to call the API.

### Live Ghost (`liveGhost.ts`)

During a drag, a **cloned DOM node** is positioned absolutely and updated on every `mousemove` to follow the cursor. This gives a more natural feel than the browser's default ghost (which is often a faded semi-transparent snapshot).

Steps:
1. `createLiveGhost(sourceEl)` — clones the dragged element, strips transitions, appends it to `document.body` with `pointer-events: none`.
2. A `mousemove` listener updates `transform: translate(x, y)` on every frame (via `requestAnimationFrame`).
3. `destroyLiveGhost()` — removes the clone on `dragend`.

### Auto-Scroll (`autoScroll.ts`)

When the user drags near the edge of a scrollable container (the board's horizontal scroll area, or a column's vertical scroll area), `autoScroll.ts` kicks in:

1. On `dragover`, computes the distance from the cursor to the container's edges.
2. If within the scroll threshold, starts a `requestAnimationFrame` loop that scrolls the container at a speed proportional to proximity.
3. Cancels when the drag ends or the cursor moves away from the edge.

---

## How Column Reordering Works

```
KanbanBoard
  └── useHtml5Drop (COLUMN_DRAG_MIME, sortable mode)
        │ wraps the column strip
        │
  └── TaskColumn header
        └── useHtml5Drag (COLUMN_DRAG_MIME, payload = { columnId })
```

1. User grabs a column header → `useHtml5Drag` fires, sets `columnId` in `dataTransfer`.
2. As the user moves over the column strip, `useHtml5Drop` (on the strip) calculates which position the column should land in based on cursor X vs column midpoints.
3. On drop: `onDrop({ columnId }, insertionIndex)` is called → `PUT /api/columns/:id` with the new `order`.
4. TanStack Query invalidates the columns query → board re-renders with new order.

---

## How Task Reordering Works

```
TaskColumn
  └── useHtml5Drop (TASK_DRAG_MIME, sortable mode)
        │ wraps the task list
        │
  └── TaskCard
        └── useHtml5Drag (TASK_DRAG_MIME, payload = { taskId, sourceColumnId })
```

### Within the same column

1. User grabs a task card → `taskId` and `sourceColumnId` go into `dataTransfer`.
2. `useHtml5Drop` on the task list calculates insertion index from cursor Y vs card midpoints.
3. On drop: `PUT /api/tasks/:id` with new `order` value (fractional index).

### Moving to a different column

1. The drag enters a different `TaskColumn` → its `useHtml5Drop` accepts the payload (same MIME type).
2. On drop: `PUT /api/tasks/:id` with new `columnId` and `order`.
3. Both source and destination columns invalidate their task queries.

---

## Styling During Drag

`markDragSource()` adds a `data-drag-source` attribute to the element being dragged. CSS can target this to dim the original while the ghost is active:

```css
[data-drag-source] {
  opacity: 0.4;
}
```

Drop targets get a `data-drop-active` attribute while a compatible payload is hovering, enabling hover highlight styles.
