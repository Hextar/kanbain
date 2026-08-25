import type { Task } from "../types/Task";

export type TaskJson = {
  id: string;
  title: string;
  columnId: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high";
  category?: string;
  tags?: string[];
  attachments?: string[];
  comments?: string[];
};

export function taskToJson(task: Task): TaskJson {
  return {
    id: task.id,
    title: task.title,
    columnId: task.columnId,
    description: task.description,
    createdAt: task.createdAt?.toISOString(),
    updatedAt: task.updatedAt?.toISOString(),
    dueDate: task.dueDate?.toISOString(),
    priority: task.priority,
    category: task.category,
    tags: task.tags,
    attachments: task.attachments,
    comments: task.comments,
  };
}

export function taskFromJson(json: TaskJson): Task {
  return {
    id: json.id,
    title: json.title,
    columnId: json.columnId,
    description: json.description,
    createdAt: json.createdAt ? new Date(json.createdAt) : undefined,
    updatedAt: json.updatedAt ? new Date(json.updatedAt) : undefined,
    dueDate: json.dueDate ? new Date(json.dueDate) : undefined,
    priority: json.priority,
    category: json.category,
    tags: json.tags,
    attachments: json.attachments,
    comments: json.comments,
  };
}
