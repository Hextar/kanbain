import { apiFetch, readJson } from "@api/env";

export const OPENAI_API_KEY_DOCS_URL =
  "https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key";

export type Settings = {
  openaiApiKeyConfigured: boolean;
  openaiApiKeyRevoked?: boolean;
  openaiApiKeyHint?: string;
};

export async function getSettings(): Promise<Settings> {
  return readJson<Settings>(
    await apiFetch("/api/settings"),
    "Failed to load settings",
  );
}

export async function updateSettings(
  openaiApiKey: string | null,
): Promise<Settings> {
  return readJson<Settings>(
    await apiFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openaiApiKey }),
    }),
    "Failed to save settings",
  );
}
