import {
  DND_DRAGGING_ATTR,
  dropHitElement,
  getVerticalInsert,
  type DropPlaceholder,
} from "@libraries/dnd/html5DnD";
import {
  COLUMN_CARD_SELECTOR,
  NESTED_LIST_SELECTOR,
  NESTED_ROW_SELECTOR,
  NEST_ZONE_SELECTOR,
} from "../constants";
import type { Task } from "../types/Task";
import { canNestUnder } from "./nesting";

export type TaskDropIntent =
  | { kind: "nest"; parentId: string }
  | {
      kind: "nested";
      parentId: string;
      destIndex: number;
      placeholder: DropPlaceholder | null;
    }
  | {
      kind: "gap";
      destIndex: number;
      placeholder: DropPlaceholder | null;
    };

export function isSameSlotDrop(
  sourceColumnId: string,
  targetColumnId: string,
  intent: TaskDropIntent,
): boolean {
  if (sourceColumnId !== targetColumnId) return false;
  if (intent.kind === "nest") return false;
  return intent.placeholder === null;
}

function eventElement(target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) return target;
  if (target instanceof Node) {
    return target.parentElement;
  }
  return null;
}

function inColumn(column: HTMLElement, element: HTMLElement | null) {
  return Boolean(element && column.contains(element));
}

function pointerInElement(
  element: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const rect = element.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

export function getDraggingTaskId(): string | null {
  const source = document.querySelector<HTMLElement>(`[${DND_DRAGGING_ATTR}]`);
  return source?.dataset.taskId ?? null;
}

function nestedIntent(
  nestedList: HTMLElement,
  clientY: number,
  dragged: Task,
): TaskDropIntent | null {
  const parentId = nestedList.dataset.parentId;
  if (!parentId || dragged.parentId !== parentId) {
    return null;
  }
  const insert = getVerticalInsert(nestedList, clientY, NESTED_ROW_SELECTOR);
  return {
    kind: "nested",
    parentId,
    destIndex: insert.destIndex,
    placeholder:
      insert.visualIndex == null
        ? null
        : { index: insert.visualIndex, height: 0 },
  };
}

function nestIntent(
  parentId: string | undefined,
  dragged: Task,
  allTasks: Task[],
): TaskDropIntent | null {
  const parent = parentId
    ? allTasks.find((task) => task.id === parentId)
    : undefined;
  if (!parentId || !parent) return null;
  if (dragged.parentId === parentId) return null;
  if (!canNestUnder(dragged, parent, allTasks)) return null;
  return { kind: "nest", parentId };
}

function ownParentNestedIntent(
  column: HTMLElement,
  clientX: number,
  clientY: number,
  dragged: Task,
): TaskDropIntent | null {
  if (!dragged.parentId) return null;
  const parentCard = column.querySelector<HTMLElement>(
    `${COLUMN_CARD_SELECTOR}[data-task-id="${dragged.parentId}"]`,
  );
  if (!parentCard || !pointerInElement(parentCard, clientX, clientY)) {
    return null;
  }
  const nestedList =
    parentCard.querySelector<HTMLElement>(NESTED_LIST_SELECTOR);
  if (!inColumn(column, nestedList ?? null) || !nestedList) return null;
  return nestedIntent(nestedList, clientY, dragged);
}

export function resolveTaskDropIntent(
  column: HTMLElement,
  clientX: number,
  clientY: number,
  target: EventTarget | null,
  dragged: Task,
  allTasks: Task[],
): TaskDropIntent {
  const ownParent = ownParentNestedIntent(column, clientX, clientY, dragged);
  if (ownParent) return ownParent;

  const hit = dropHitElement(clientX, clientY) ?? eventElement(target);

  const nestedRow = hit?.closest<HTMLElement>(NESTED_ROW_SELECTOR);
  const nestedList = nestedRow?.closest<HTMLElement>(NESTED_LIST_SELECTOR);
  if (inColumn(column, nestedList ?? null) && nestedList) {
    const nested = nestedIntent(nestedList, clientY, dragged);
    if (nested) return nested;
  }

  const nestZone = hit?.closest<HTMLElement>(NEST_ZONE_SELECTOR);
  if (inColumn(column, nestZone ?? null) && nestZone) {
    const nested = nestIntent(nestZone.dataset.taskId, dragged, allTasks);
    if (nested) return nested;
  }

  const card = hit?.closest<HTMLElement>(COLUMN_CARD_SELECTOR);
  if (inColumn(column, card ?? null) && card) {
    const nested = nestIntent(card.dataset.taskId, dragged, allTasks);
    if (nested) return nested;
  }

  const insert = getVerticalInsert(column, clientY, COLUMN_CARD_SELECTOR);
  return {
    kind: "gap",
    destIndex: insert.destIndex,
    placeholder:
      insert.visualIndex == null
        ? null
        : { index: insert.visualIndex, height: insert.previewHeight },
  };
}
