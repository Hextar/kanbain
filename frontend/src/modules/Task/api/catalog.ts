import { apiFetch, readJson } from "@api/env";
import type { Assignee, Tag } from "../types/Catalog";

export async function getAssignees(): Promise<Assignee[]> {
  return readJson<Assignee[]>(
    await apiFetch("/api/assignees"),
    "Failed to load assignees",
  );
}

export async function createAssignee(name: string): Promise<Assignee> {
  return readJson<Assignee>(
    await apiFetch("/api/assignees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
    "Failed to create assignee",
  );
}

export async function getTags(): Promise<Tag[]> {
  return readJson<Tag[]>(await apiFetch("/api/tags"), "Failed to load tags");
}

export async function createTag(name: string): Promise<Tag> {
  return readJson<Tag>(
    await apiFetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
    "Failed to create tag",
  );
}
