import type { Column } from "../types/Column";
import type { WorkKind } from "../types/Catalog";
import type { Task } from "../types/Task";
import { compareTasksByOrder } from "./taskOrder";

export type VisibleColumnCard = {
  task: Task;
  nested: Task[];
  doneCount: number;
  childCount: number;
};

export function lastColumnId(columns: Column[]): string | undefined {
  if (columns.length === 0) return undefined;
  let last = columns[0];
  for (let index = 1; index < columns.length; index++) {
    if (columns[index].order > last.order) last = columns[index];
  }
  return last.id;
}

export function declaredWorkKind(task: Task): WorkKind | undefined {
  if (
    task.workKind === "epic" ||
    task.workKind === "story" ||
    task.workKind === "task"
  ) {
    return task.workKind;
  }
  return undefined;
}

export function mergeTaskLists(
  allTasks: Task[],
  columnTasks: Task[],
): Map<string, Task> {
  const byId = new Map<string, Task>();
  for (const task of allTasks) {
    byId.set(task.id, task);
  }
  for (const task of columnTasks) {
    const previous = byId.get(task.id);
    if (!previous) {
      byId.set(task.id, task);
      continue;
    }
    byId.set(task.id, {
      ...previous,
      ...task,
    });
  }
  return byId;
}

export function childrenByParentId(tasks: Task[]): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.parentId) continue;
    const list = grouped.get(task.parentId);
    if (list) {
      list.push(task);
    } else {
      grouped.set(task.parentId, [task]);
    }
  }
  for (const [parentId, list] of grouped) {
    grouped.set(parentId, list.toSorted(compareTasksByOrder));
  }
  return grouped;
}

export function resolveWorkKind(
  task: Task,
  children: Map<string, Task[]>,
): WorkKind {
  const declared = declaredWorkKind(task);
  if (declared) return declared;

  const kids = children.get(task.id) ?? [];
  const hasGrandchildren = kids.some(
    (child) => (children.get(child.id) ?? []).length > 0,
  );
  if (!task.parentId) {
    if (hasGrandchildren) return "epic";
    if (kids.length > 0) return "story";
    return "task";
  }
  if (kids.length > 0) return "story";
  return "task";
}

export function visibleColumnCards(
  columnId: string,
  columnTasks: Task[],
  allTasks: Task[],
  doneColumnId?: string,
): VisibleColumnCard[] {
  const byId = mergeTaskLists(allTasks, columnTasks);
  const children = childrenByParentId([...byId.values()]);
  const kindOf = (task: Task) => resolveWorkKind(task, children);
  const visible: VisibleColumnCard[] = [];

  const orderedColumn = columnTasks
    .map((task) => byId.get(task.id) ?? task)
    .toSorted(compareTasksByOrder);

  for (const task of orderedColumn) {
    const kind = kindOf(task);
    if (kind === "epic") continue;

    if (kind === "story") {
      const kids = children.get(task.id) ?? [];
      visible.push({
        task,
        nested: kids.filter((child) => child.columnId === columnId),
        doneCount: doneColumnId
          ? kids.filter((child) => child.columnId === doneColumnId).length
          : 0,
        childCount: kids.length,
      });
      continue;
    }

    const parent = task.parentId ? byId.get(task.parentId) : undefined;
    if (parent && kindOf(parent) === "story" && parent.columnId === columnId) {
      continue;
    }
    visible.push({
      task,
      nested: [],
      doneCount: 0,
      childCount: 0,
    });
  }
  return visible;
}

export function insertIndexAmongColumnTasks(
  visible: VisibleColumnCard[],
  columnTasks: Task[],
  visibleIndex: number,
  movedId: string,
): number {
  const remaining = columnTasks.filter((task) => task.id !== movedId);
  const destVisible = visible.filter((card) => card.task.id !== movedId);
  if (visibleIndex >= destVisible.length) return remaining.length;
  const before = destVisible[visibleIndex];
  const index = remaining.findIndex((task) => task.id === before.task.id);
  return index < 0 ? remaining.length : index;
}

export type AncestorMove = {
  fromColumnId: string;
  task: Task;
};

export function ancestorsToComplete(
  moved: Task,
  allTasks: Task[],
  doneColumnId: string,
): AncestorMove[] {
  const byId = mergeTaskLists(allTasks, [moved]);
  const completed: AncestorMove[] = [];
  const columnOf = (task: Task) => {
    if (task.id === moved.id) return moved.columnId;
    return (
      completed.find((item) => item.task.id === task.id)?.task.columnId ??
      task.columnId
    );
  };

  let parentId = moved.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    const children = [...byId.values()].filter(
      (task) => task.parentId === parent.id,
    );
    if (
      children.length === 0 ||
      children.some((child) => columnOf(child) !== doneColumnId)
    ) {
      break;
    }
    if (columnOf(parent) !== doneColumnId) {
      completed.push({
        fromColumnId: parent.columnId,
        task: { ...parent, columnId: doneColumnId },
      });
    }
    parentId = parent.parentId;
  }
  return completed;
}
