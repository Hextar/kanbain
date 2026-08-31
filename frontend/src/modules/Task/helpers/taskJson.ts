import type { Task } from "../types/Task";
import type { TaskPriority, TshirtSize, WorkKind } from "../types/Catalog";

export type TaskJson = {
  id: string;
  title: string;
  columnId: string;
  order?: number;
  number?: number | null;
  projectId?: string;
  parentId?: string | null;
  parent_id?: string | null;
  workKind?: WorkKind | null;
  work_kind?: WorkKind | null;
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
    number: task.taskNumber ?? null,
    projectId: task.projectId,
    parentId: task.parentId ?? null,
    workKind: task.workKind ?? null,
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

function optionalId(value: string | null | undefined): string | undefined {
  return value ? value : undefined;
}

function optionalWorkKind(
  value: WorkKind | string | null | undefined,
): WorkKind | undefined {
  if (value === "epic" || value === "story" || value === "task") return value;
  return undefined;
}

export function taskFromJson(json: TaskJson): Task {
  return {
    id: json.id,
    title: json.title,
    columnId: json.columnId,
    order: json.order ?? 0,
    taskNumber:
      typeof json.number === "number" && json.number > 0
        ? json.number
        : undefined,
    projectId: json.projectId ?? undefined,
    parentId: optionalId(json.parentId ?? json.parent_id),
    workKind: optionalWorkKind(json.workKind ?? json.work_kind),
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
