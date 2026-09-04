# Realtime Updates

KanbAIn keeps all connected browser tabs in sync using a **WebSocket connection** to the Flask backend. When the AI planner finishes, tasks change, or the board is mutated, every tab on that project sees the update without a page refresh.

Source files: `frontend/src/libraries/realtime/`

---

## Overview

```
Flask backend
     │
     │  publishes to Redis pub/sub
     │  channel: kanbain:room:project:{id}
     ▼
Flask WebSocket server (ws://host:3000/ws?ticket=…)
     │
     │  broadcasts JSON event envelope
     ▼
RealtimeProvider (Next.js)
     │
     ▼
applyRealtimeMessage()
     │
     ├── plan.updated  →  patch TanStack Query cache (planStatus, planPhase…)
     │                    if status → "ready": invalidate board + project
     │
     └── board.updated →  invalidate columns + tasks + project queries
```

---

## Connection (`session.ts`)

`session.ts` handles the WebSocket lifecycle:

- **Client ID**: generates a UUID per browser tab and persists it in `sessionStorage` under `kanbain:realtime-client:v1`. This ID is sent as `X-Realtime-Client` with every mutating HTTP request (see [Deduplication](#deduplication) below).
- **WS URL**: resolved from `NEXT_PUBLIC_WS_URL` env var; defaults to `ws://<hostname>:3000/ws`. Setting the env var to `"off"` disables WebSocket entirely (useful for testing).
- **Reconnect**: a simple exponential back-off reconnect loop. If the socket drops, it retries with increasing delays up to a cap.
- **Fallback**: a 2-second polling interval activates when the WebSocket connection is unavailable, fetching project status via HTTP until the socket reconnects.

The `RealtimeProvider` React component (imported in the root `providers.tsx`) establishes the connection and tears it down when unmounted.

---

## Event Handling (`applyEvent.ts`)

All incoming WebSocket messages are parsed by `applyRealtimeMessage(message, queryClient)`. The message shape is:

```json
{
  "event": "plan.updated",
  "projectId": "abc-123",
  "origin": "tab-uuid-here",
  "payload": { ... }
}
```

### `plan.updated`

Fired by the backend at each phase transition during AI planning, and when planning completes or fails.

Payload fields:
- `planStatus` — `"planning"` | `"ready"` | `"failed"`
- `planPhase` — current phase label (e.g. `"generating"`, `"reviewing"`)
- `planError` — error message if failed
- `planWarning` — non-fatal warning (e.g. poor RAG coverage)

**Handler behaviour**:
1. Calls `queryClient.setQueryData(["project", projectId], updater)` to patch the plan fields directly — no network round-trip.
2. If `planStatus` transitions to `"ready"`, additionally calls `queryClient.invalidateQueries(["board", projectId])` and `queryClient.invalidateQueries(["project", projectId])` to trigger a fresh fetch of the newly created board.

This means the planning progress UI updates in real time (phase label, spinner), and the board appears the moment planning completes.

### `board.updated`

Fired after any board mutation (task create/update/delete, column reorder, member change, etc.).

**Handler behaviour**:
- Invalidates `["columns", projectId]`, `["tasks", projectId]`, and `["project", projectId]` queries.
- TanStack Query refetches in the background; the UI updates when the fresh data arrives.

---

## Deduplication

Without deduplication, a tab that creates a task would:
1. Optimistically update its own cache (via the mutation's `onSuccess`)
2. Receive the `board.updated` WS event and invalidate queries again — causing a redundant network fetch

**The fix**: every `PUT`/`POST`/`DELETE` request includes the header:

```
X-Realtime-Client: <tab-uuid>
```

The Flask backend reads this header and includes `"origin": "<tab-uuid>"` in the published WS event.

`applyRealtimeMessage` checks:

```ts
if (message.origin === getClientId()) {
  return; // skip — we caused this event
}
```

Other tabs (which have different UUIDs) apply the event normally.

---

## Subscribing to a Project Room

When a user opens a project workspace, `RealtimeProvider` fetches `GET /api/auth/ws-ticket` and connects to `ws://host:3000/ws?ticket=…`. It then sends:

```json
{ "type": "subscribe", "projectId": "abc-123" }
```

The Flask WS server validates the ticket, binds the connection to that organization, and only allows subscribe for projects in that org.

---

## Disabling WebSocket (Development)

Set `NEXT_PUBLIC_WS_URL=off` in your `.env.local` to disable the WebSocket entirely. The app falls back to polling-only mode. Useful when running only the frontend with a mock API.
