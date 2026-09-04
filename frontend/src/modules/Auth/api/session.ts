import { cache } from "react";
import { apiFetch, expectOk, readJson } from "@api/env";
import type { AuthCredentials, AuthSession, RegisterResult } from "../types";

const ME_URL = "/api/auth/me";

export const getSession = cache(async (): Promise<AuthSession> => {
  return readJson<AuthSession>(await apiFetch(ME_URL), "Unauthorized");
});

export async function login(credentials: AuthCredentials): Promise<AuthSession> {
  return readJson<AuthSession>(
    await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    }),
    "Couldn't sign in",
  );
}

export async function register(
  credentials: AuthCredentials,
): Promise<RegisterResult> {
  return readJson<RegisterResult>(
    await apiFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        name: credentials.name,
      }),
    }),
    "Couldn't create account",
  );
}

export async function activateAccount(token: string): Promise<AuthSession> {
  return readJson<AuthSession>(
    await apiFetch("/api/auth/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }),
    "Couldn't activate this account",
  );
}

export async function resendActivation(email: string): Promise<void> {
  await expectOk(
    await apiFetch("/api/auth/resend-activation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),
    "Couldn't resend the activation email",
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  await expectOk(
    await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),
    "Couldn't send a reset email",
  );
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<AuthSession> {
  return readJson<AuthSession>(
    await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }),
    "Couldn't reset this password",
  );
}

export async function logout(): Promise<void> {
  await expectOk(await apiFetch("/api/auth/logout", { method: "POST" }), "Couldn't sign out");
}

export async function fetchWsTicket(): Promise<string | null> {
  const response = await apiFetch("/api/auth/ws-ticket");
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  if (
    payload !== null &&
    typeof payload === "object" &&
    "ticket" in payload &&
    typeof payload.ticket === "string"
  ) {
    return payload.ticket;
  }
  return null;
}
