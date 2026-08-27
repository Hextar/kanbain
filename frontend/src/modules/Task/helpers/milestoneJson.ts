import type { Milestone } from "../types/Catalog";

export type MilestoneJson = {
  id: string;
  projectId: string;
  title: string;
  order: number;
  dueAt?: string;
};

export function milestoneFromJson(json: MilestoneJson): Milestone {
  return {
    id: json.id,
    projectId: json.projectId,
    title: json.title,
    order: json.order,
    dueAt: json.dueAt ? new Date(json.dueAt) : undefined,
  };
}

export function milestoneToJson(milestone: Milestone): MilestoneJson {
  return {
    id: milestone.id,
    projectId: milestone.projectId,
    title: milestone.title,
    order: milestone.order,
    dueAt: milestone.dueAt?.toISOString(),
  };
}
