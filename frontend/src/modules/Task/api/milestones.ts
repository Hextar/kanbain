import { apiFetch, readJson } from "@api/env";
import type { Milestone } from "../types/Catalog";
import {
  milestoneFromJson,
  type MilestoneJson,
} from "../helpers/milestoneJson";

export async function getMilestones(projectId: string): Promise<Milestone[]> {
  const payload = await readJson<MilestoneJson[]>(
    await apiFetch(`/api/projects/${projectId}/milestones`),
    "Failed to load milestones",
  );
  return payload.map(milestoneFromJson);
}

export async function createMilestone(
  projectId: string,
  title: string,
): Promise<Milestone> {
  const payload = await readJson<MilestoneJson>(
    await apiFetch(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),
    "Failed to create milestone",
  );
  return milestoneFromJson(payload);
}

export async function updateMilestone(
  projectId: string,
  milestone: Pick<Milestone, "id" | "title">,
): Promise<Milestone> {
  const payload = await readJson<MilestoneJson>(
    await apiFetch(`/api/projects/${projectId}/milestones/${milestone.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: milestone.title }),
    }),
    "Failed to update milestone",
  );
  return milestoneFromJson(payload);
}
