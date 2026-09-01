import { REALTIME_CLIENT_HEADER, realtimeClientId } from "@libraries/realtime/session";

export function isMockApi() {
  return process.env.MOCK_API === "1" || process.env.MOCK_API === "true";
}

export function apiOrigin() {
  return process.env.API_URL ?? "http://localhost:3000";
}

export async function apiFetch(path: string, init?: RequestInit) {
  if (isMockApi()) {
    const { handleMock } = await import("./mockDb");
    const url = new URL(path, "http://kanbain.mock");
    const request = new Request(url, {
      method: init?.method ?? "GET",
      headers: init?.headers,
      body: init?.body,
    });
    return handleMock(request, url.pathname);
  }
  const url =
    typeof window === "undefined"
      ? new URL(path, apiOrigin()).toString()
      : path;
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined") {
    headers.set(REALTIME_CLIENT_HEADER, realtimeClientId());
  }
  return fetch(url, { cache: "no-store", ...init, headers });
}

export async function readJson<T>(
  response: Response,
  errorMessage: string,
): Promise<T> {
  if (!response.ok) {
    let message = errorMessage;
    try {
      const body: unknown = await response.json();
      if (
        body !== null &&
        typeof body === "object" &&
        "message" in body &&
        typeof body.message === "string"
      ) {
        message = body.message;
      }
    } catch {
      /* use fallback */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function expectOk(response: Response, errorMessage: string) {
  if (response.ok) return;
  await readJson(response, errorMessage);
}
