export function isMockApi() {
  return process.env.MOCK_API === "1" || process.env.MOCK_API === "true";
}

export function apiOrigin() {
  return process.env.API_URL ?? "http://localhost:3000";
}

export function apiFetch(path: string, init?: RequestInit) {
  const url =
    typeof window === "undefined"
      ? new URL(path, apiOrigin()).toString()
      : path;
  return fetch(url, { cache: "no-store", ...init });
}

export async function readJson<T>(
  response: Response,
  errorMessage: string,
): Promise<T> {
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}
