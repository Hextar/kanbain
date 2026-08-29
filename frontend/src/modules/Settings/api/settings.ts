export type Settings = {
  openaiApiKeyConfigured: boolean;
  openaiApiKeyHint?: string;
};

export async function getSettings(): Promise<Settings> {
  const response = await fetch("/api/settings", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load settings");
  return response.json() as Promise<Settings>;
}

export async function updateSettings(openaiApiKey: string | null): Promise<Settings> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ openaiApiKey }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to save settings");
  return response.json() as Promise<Settings>;
}
