import type { Column } from "./Column";
import type { TaskPriority, TshirtSize, WorkKind } from "./Catalog";

export type Task = {
  id: string;
  title: string;
  columnId: Column["id"];
  order: number;
  taskNumber?: number;
  projectId?: string;
  parentId?: string;
  workKind?: WorkKind;
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
  order?: number;
  projectId?: Task["projectId"];
  parentId?: Task["parentId"];
  workKind?: Task["workKind"];
  description?: string;
  priority?: Task["priority"];
  category?: Task["category"];
  estimateTshirt?: Task["estimateTshirt"];
  assigneeId?: Task["assigneeId"];
  milestoneId?: Task["milestoneId"];
  tags?: Task["tags"];
};

export type TaskListFilters = {
  projectId?: Task["projectId"];
  columnId?: Column["id"];
  category?: Task["category"];
  priority?: Task["priority"];
};

export type TaskItem = Task & {
  isSaving?: boolean;
};
