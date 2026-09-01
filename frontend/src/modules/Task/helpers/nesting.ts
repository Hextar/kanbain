import type { WorkKind } from "../types/Catalog";
import type { Task } from "../types/Task";
import { compareTasksByOrder } from "./taskOrder";
import {
  childrenByParentId,
  resolveWorkKind,
} from "./visibleColumnCards";

export function descendantIds(
  taskId: string,
  children: Map<string, Task[]>,
): Set<string> {
  const result = new Set<string>();
  const stack = [...(children.get(taskId) ?? [])];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || result.has(node.id)) continue;
    result.add(node.id);
    stack.push(...(children.get(node.id) ?? []));
  }
  return result;
}

export function taskTreeIds(rootId: string, tasks: Task[]): Set<string> {
  const ids = descendantIds(rootId, childrenByParentId(tasks));
  ids.add(rootId);
  return ids;
}

export function canNestUnder(
  dragged: Task,
  parent: Task,
  allTasks: Task[],
): boolean {
  if (dragged.id === parent.id) return false;
  const children = childrenByParentId(allTasks);
  if (descendantIds(dragged.id, children).has(parent.id)) return false;

  const parentKind = resolveWorkKind(parent, children);
  const draggedKind = resolveWorkKind(dragged, children);
  if (draggedKind === "epic") return false;

  if (parentKind === "task" && parent.parentId) return false;

  const draggedKids = children.get(dragged.id) ?? [];
  if (parentKind === "epic") return true;
  return draggedKids.length === 0;
}

export function eligibleParents(task: Task, allTasks: Task[]): Task[] {
  return allTasks.filter((candidate) => canNestUnder(task, candidate, allTasks));
}

export function nestWorkKind(
  dragged: Task,
  parent: Task,
  allTasks: Task[],
): { movedWorkKind: WorkKind; parentWorkKind?: WorkKind } {
  const children = childrenByParentId(allTasks);
  const parentKind = resolveWorkKind(parent, children);
  if (parentKind === "epic") {
    return { movedWorkKind: "story" };
  }
  if (parentKind === "task" && !parent.parentId) {
    return { movedWorkKind: "task", parentWorkKind: "story" };
  }
  return { movedWorkKind: "task" };
}

export function unnestWorkKind(dragged: Task, allTasks: Task[]): WorkKind {
  if (dragged.workKind === "epic") return "epic";
  const children = childrenByParentId(allTasks);
  return (children.get(dragged.id) ?? []).length > 0 ? "story" : "task";
}

export function shouldDemoteParent(
  parent: Task,
  remainingChildCount: number,
): boolean {
  return remainingChildCount === 0 && parent.workKind === "story";
}

export function nestedInsertIndex(
  parentId: string,
  columnTasks: Task[],
  destIndex: number,
  movedId: string,
): number {
  const remaining = columnTasks.filter((task) => task.id !== movedId);
  const siblings = remaining
    .filter((task) => task.parentId === parentId)
    .toSorted(compareTasksByOrder);
  if (destIndex >= siblings.length) {
    if (siblings.length === 0) {
      const parentIndex = remaining.findIndex((task) => task.id === parentId);
      return parentIndex < 0 ? remaining.length : parentIndex + 1;
    }
    const last = siblings[siblings.length - 1];
    const index = remaining.findIndex((task) => task.id === last.id);
    return index < 0 ? remaining.length : index + 1;
  }
  const before = siblings[destIndex];
  const index = remaining.findIndex((task) => task.id === before.id);
  return index < 0 ? remaining.length : index;
}
