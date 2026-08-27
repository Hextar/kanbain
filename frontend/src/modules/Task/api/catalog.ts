import type { Assignee, Tag } from "../types/Catalog";

export async function getAssignees(): Promise<Assignee[]> {
  const response = await fetch("/api/assignees");
  if (!response.ok) throw new Error("Failed to load assignees");
  return response.json();
}

export async function createAssignee(name: string): Promise<Assignee> {
  const response = await fetch("/api/assignees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Failed to create assignee");
  }
  return response.json();
}

export async function getTags(): Promise<Tag[]> {
  const response = await fetch("/api/tags");
  if (!response.ok) throw new Error("Failed to load tags");
  return response.json();
}

export async function createTag(name: string): Promise<Tag> {
  const response = await fetch("/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Failed to create tag");
  }
  return response.json();
}
