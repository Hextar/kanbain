import type { Column } from "./Column";
import type { TaskPriority, TshirtSize } from "./Catalog";

export type Task = {
  id: string;
  title: string;
  columnId: Column["id"];
  projectId?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  dueDate?: Date;
  priority?: TaskPriority;
  category?: string;
  estimateTshirt?: TshirtSize;
  assigneeId?: string;
  milestoneId?: string;
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
  estimateTshirt?: Task["estimateTshirt"];
  assigneeId?: Task["assigneeId"];
  milestoneId?: Task["milestoneId"];
  tags?: Task["tags"];
};

export type TaskListFilters = {
  columnId?: Column["id"];
  category?: Task["category"];
  priority?: Task["priority"];
};

export type TaskItem = Task & {
  isSaving?: boolean;
};
