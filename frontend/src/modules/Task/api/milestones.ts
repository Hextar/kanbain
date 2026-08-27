import type { Milestone } from "../types/Catalog";
import {
  milestoneFromJson,
  type MilestoneJson,
} from "../helpers/milestoneJson";

export async function getMilestones(projectId: string): Promise<Milestone[]> {
  const response = await fetch(`/api/projects/${projectId}/milestones`);
  if (!response.ok) throw new Error("Failed to load milestones");
  const payload = (await response.json()) as MilestoneJson[];
  return payload.map(milestoneFromJson);
}

export async function createMilestone(
  projectId: string,
  title: string,
): Promise<Milestone> {
  const response = await fetch(`/api/projects/${projectId}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Failed to create milestone");
  }
  return milestoneFromJson((await response.json()) as MilestoneJson);
}
