import { apiFetch, readJson } from "@api/env";

export type Settings = {
  openaiApiKeyConfigured: boolean;
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
