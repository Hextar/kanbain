import type { Column } from "./types/Column";
import type { Task } from "./types/Task";

export const TASK_DRAG_MIME = "application/x-kanbain-task";
export const COLUMN_DRAG_MIME = "application/x-kanbain-column";
export const COLUMN_CARD_SELECTOR = "[data-dnd-column-card]";
export const BOARD_COLUMN_SELECTOR = "[data-dnd-board-column]";
export const NEST_ZONE_SELECTOR = "[data-dnd-nest-zone]";
export const NESTED_LIST_SELECTOR = "[data-dnd-nested-list]";
export const NESTED_ROW_SELECTOR = "[data-dnd-nested-row]";

export type TaskDragPayload = {
  taskId: Task["id"];
  sourceColumnId: Column["id"];
};

export type ColumnDragPayload = {
  columnId: Column["id"];
};
