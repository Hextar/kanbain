export const catalogKeys = {
  assignees: ["assignees"] as const,
  tags: ["tags"] as const,
  milestones: (projectId: string) => ["milestones", projectId] as const,
};
