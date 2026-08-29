import type { Column } from "../types/Column";
import type { Task } from "../types/Task";
import { compareTasksByOrder } from "./taskOrder";

export function groupTasksByColumn(
  columns: Column[],
  tasks: Task[],
): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>();
  for (const column of columns) {
    grouped.set(column.id, []);
  }
  for (const task of tasks) {
    const list = grouped.get(task.columnId);
    if (list) {
      list.push(task);
      continue;
    }
    grouped.set(task.columnId, [task]);
  }
  for (const [columnId, list] of grouped) {
    grouped.set(columnId, list.toSorted(compareTasksByOrder));
  }
  return grouped;
}
