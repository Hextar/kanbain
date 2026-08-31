export type TshirtSize = "xs" | "s" | "m" | "l" | "xl";
export type TaskPriority = "low" | "medium" | "high";
export type WorkKind = "epic" | "story" | "task";

export type Assignee = {
  id: string;
  name: string;
};

export type Tag = {
  id: string;
  name: string;
};

export type Milestone = {
  id: string;
  projectId: string;
  title: string;
  order: number;
  dueAt?: Date;
};
