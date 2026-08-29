import type { Task } from "../types/Task";
import type { TaskPriority, TshirtSize } from "../types/Catalog";

export type TaskJson = {
  id: string;
  title: string;
  columnId: string;
  order?: number;
  projectId?: string;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority | null;
  category?: string | null;
  estimateTshirt?: TshirtSize | null;
  assigneeId?: string | null;
  milestoneId?: string | null;
  tags?: string[] | null;
  attachments?: string[] | null;
  comments?: string[] | null;
};

export function taskToJson(task: Task): TaskJson {
  return {
    id: task.id,
    title: task.title,
    columnId: task.columnId,
    order: task.order,
    projectId: task.projectId,
    description: task.description ?? null,
    createdAt: task.createdAt?.toISOString() ?? null,
    updatedAt: task.updatedAt?.toISOString() ?? null,
    dueDate: task.dueDate?.toISOString() ?? null,
    priority: task.priority ?? null,
    category: task.category ?? null,
    estimateTshirt: task.estimateTshirt ?? null,
    assigneeId: task.assigneeId ?? null,
    milestoneId: task.milestoneId ?? null,
    tags: task.tags ?? null,
    attachments: task.attachments ?? null,
    comments: task.comments ?? null,
  };
}

export function taskFromJson(json: TaskJson): Task {
  return {
    id: json.id,
    title: json.title,
    columnId: json.columnId,
    order: json.order ?? 0,
    projectId: json.projectId ?? undefined,
    description: json.description ?? undefined,
    createdAt: json.createdAt ? new Date(json.createdAt) : undefined,
    updatedAt: json.updatedAt ? new Date(json.updatedAt) : undefined,
    dueDate: json.dueDate ? new Date(json.dueDate) : undefined,
    priority: json.priority ?? undefined,
    category: json.category ?? undefined,
    estimateTshirt: json.estimateTshirt ?? undefined,
    assigneeId: json.assigneeId ?? undefined,
    milestoneId: json.milestoneId ?? undefined,
    tags: json.tags ?? undefined,
    attachments: json.attachments ?? undefined,
    comments: json.comments ?? undefined,
  };
}
