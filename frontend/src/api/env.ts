import { REALTIME_CLIENT_HEADER, realtimeClientId } from "@libraries/realtime/session";

export function isMockApi() {
  return process.env.MOCK_API === "1" || process.env.MOCK_API === "true";
}

export function apiOrigin() {
  return process.env.API_URL ?? "http://localhost:3000";
}

export class UnauthorizedError extends Error {
  readonly status = 401;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function requestCookieHeader(): Promise<string | null> {
  if (typeof window !== "undefined") return null;
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const value = jar.toString();
  return value || null;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined") {
    headers.set(REALTIME_CLIENT_HEADER, realtimeClientId());
  } else {
    const cookie = await requestCookieHeader();
    if (cookie) headers.set("cookie", cookie);
  }

  if (isMockApi()) {
    const { handleMock } = await import("./mockDb");
    const url = new URL(path, "http://kanbain.mock");
    const request = new Request(url, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body,
    });
    return handleMock(request, url.pathname);
  }

  const url =
    typeof window === "undefined"
      ? new URL(path, apiOrigin()).toString()
      : path;
  return fetch(url, {
    cache: "no-store",
    ...init,
    headers,
    credentials: typeof window === "undefined" ? "omit" : "include",
  });
}

export async function readJson<T>(
  response: Response,
  errorMessage: string,
): Promise<T> {
  if (!response.ok) {
    let message = errorMessage;
    let code: string | undefined;
    try {
      const body: unknown = await response.json();
      if (body !== null && typeof body === "object") {
        if ("message" in body && typeof body.message === "string") {
          message = body.message;
        }
        if ("code" in body && typeof body.code === "string") {
          code = body.code;
        }
      }
    } catch {
      /* use fallback */
    }
    if (response.status === 401) {
      throw new UnauthorizedError(message);
    }
    throw new ApiError(message, response.status, code);
  }
  return response.json() as Promise<T>;
}

export async function expectOk(response: Response, errorMessage: string) {
  if (response.ok) return;
  await readJson(response, errorMessage);
}
