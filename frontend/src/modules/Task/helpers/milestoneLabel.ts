import type { Milestone } from "../types/Catalog";

function compareMilestones(
  left: Pick<Milestone, "id" | "order">,
  right: Pick<Milestone, "id" | "order">,
) {
  return left.order - right.order || left.id.localeCompare(right.id);
}

export function milestoneIndex(
  milestoneId: string,
  milestones: Pick<Milestone, "id" | "order">[],
): number {
  return milestones
    .toSorted(compareMilestones)
    .findIndex((milestone) => milestone.id === milestoneId);
}

export function milestoneKey(
  milestoneId: string,
  milestones: Pick<Milestone, "id" | "order">[],
): string | null {
  const index = milestoneIndex(milestoneId, milestones);
  return index < 0 ? null : `M${index + 1}`;
}

export function milestoneLabel(
  milestone: Pick<Milestone, "id" | "title" | "order">,
  milestones: Pick<Milestone, "id" | "order">[],
): string {
  const key = milestoneKey(milestone.id, milestones);
  return key ? `${key} ${milestone.title}` : milestone.title;
}
