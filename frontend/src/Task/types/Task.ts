import type { Column } from "./Column";

export type Task = {
  id: string;
  title: string;
  columnId: Column["id"];
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  dueDate?: Date;
  priority?: "low" | "medium" | "high";
  category?: string;
  tags?: string[];
  attachments?: string[];
  comments?: string[];
};

export type CreateTaskInput = {
  id?: Task["id"];
  title: string;
  columnId: Column["id"];
  description?: string;
  priority?: Task["priority"];
  category?: Task["category"];
};

export type TaskListFilters = {
  columnId?: Column["id"];
  category?: Task["category"];
  priority?: Task["priority"];
};

export type TaskItem = Task & {
  isSaving?: boolean;
};
