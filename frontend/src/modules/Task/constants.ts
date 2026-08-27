import type { Column } from "./types/Column";
import type { Task } from "./types/Task";

export const TASK_DRAG_MIME = "application/x-kanbain-task";

export type TaskDragPayload = {
  taskId: Task["id"];
  sourceColumnId: Column["id"];
};
