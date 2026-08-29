import type { Task } from "../types/Task";

export function compareTasksByOrder(left: Task, right: Task) {
  return left.order - right.order || left.id.localeCompare(right.id);
}
