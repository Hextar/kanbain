const STORAGE_KEY = "kanbain:realtime-client:v1";

export const REALTIME_CLIENT_HEADER = "X-Realtime-Client";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Math.random().toString(36).slice(2)}`;
}

export function realtimeClientId(): string {
  if (typeof window === "undefined") return createId();
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const next = createId();
    window.sessionStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return createId();
  }
}

export function wsUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit === "off") return null;
  if (explicit) return explicit;
  if (typeof window === "undefined") return null;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:3000/ws`;
}
