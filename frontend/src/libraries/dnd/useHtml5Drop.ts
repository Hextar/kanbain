"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { noteDropAutoScroll, stopDropAutoScroll } from "./autoScroll";
import {
  DND_ITEM_SELECTOR,
  dropHitElement,
  getDragData,
  getHorizontalInsert,
  getVerticalInsert,
  hasDragMime,
  type DropInsert,
  type DropPlaceholder,
} from "./html5DnD";

type SortableOptions = {
  axis?: "x" | "y";
  itemSelector?: string;
  resolvePlaceholder?: (
    event: DragEvent<HTMLElement>,
    insert: DropInsert,
  ) => DropPlaceholder | null | undefined;
};

type UseHtml5DropOptions<T> = {
  mimeType: string;
  onDrop: (
    data: T,
    event: DragEvent<HTMLElement>,
    insertIndex?: number,
  ) => void;
  canDrop?: (data: T) => boolean;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  sortable?: boolean | SortableOptions;
};

function sortableItemSelector(
  sortable: UseHtml5DropOptions<unknown>["sortable"],
) {
  if (!sortable) return null;
  if (sortable === true) return DND_ITEM_SELECTOR;
  return sortable.itemSelector ?? DND_ITEM_SELECTOR;
}

function sortableAxis(sortable: UseHtml5DropOptions<unknown>["sortable"]) {
  if (sortable && typeof sortable === "object" && sortable.axis === "x") {
    return "x" as const;
  }
  return "y" as const;
}

function readInsert(
  container: HTMLElement,
  event: DragEvent<HTMLElement>,
  itemSelector: string,
  axis: "x" | "y",
) {
  return axis === "x"
    ? getHorizontalInsert(container, event.clientX, itemSelector)
    : getVerticalInsert(container, event.clientY, itemSelector);
}

function defaultPlaceholder(
  insert: DropInsert,
  axis: "x" | "y",
): DropPlaceholder | null {
  if (insert.visualIndex == null) return null;
  return axis === "x"
    ? {
        index: insert.visualIndex,
        height: insert.previewHeight,
        width: insert.previewWidth,
      }
    : { index: insert.visualIndex, height: insert.previewHeight };
}

function placeholdersEqual(
  left: DropPlaceholder | null,
  right: DropPlaceholder | null,
) {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    left.index === right.index &&
    left.height === right.height &&
    left.width === right.width
  );
}

type DropZone = object;
type OverListener = (zone: DropZone | null) => void;

let activeDropZone: DropZone | null = null;
const overListeners = new Set<OverListener>();

function setActiveDropZone(zone: DropZone | null) {
  if (activeDropZone === zone) return;
  activeDropZone = zone;
  for (const listener of overListeners) listener(zone);
}

function stillInside(container: HTMLElement, event: DragEvent<HTMLElement>) {
  const related = event.relatedTarget;
  if (related instanceof Node && container.contains(related)) return true;
  const hit = dropHitElement(event.clientX, event.clientY);
  return Boolean(hit && container.contains(hit));
}

export function useHtml5Drop<T>({
  mimeType,
  onDrop,
  canDrop,
  onDragOver,
  sortable,
}: UseHtml5DropOptions<T>) {
  const [isOver, setIsOver] = useState(false);
  const [placeholder, setPlaceholder] = useState<DropPlaceholder | null>(null);
  const zoneRef = useRef<DropZone>({});
  const placeholderRef = useRef<DropPlaceholder | null>(null);
  const itemSelector = sortableItemSelector(sortable);
  const axis = sortableAxis(sortable);

  const setPlaceholderIfChanged = useCallback(
    (next: DropPlaceholder | null) => {
      if (placeholdersEqual(placeholderRef.current, next)) return;
      placeholderRef.current = next;
      setPlaceholder(next);
    },
    [],
  );

  const resetOver = useCallback(() => {
    setIsOver(false);
    setPlaceholderIfChanged(null);
  }, [setPlaceholderIfChanged]);

  const leaveZone = useCallback(() => {
    if (activeDropZone === zoneRef.current) setActiveDropZone(null);
    resetOver();
  }, [resetOver]);

  const claimZone = useCallback(() => {
    setActiveDropZone(zoneRef.current);
    setIsOver(true);
  }, []);

  useEffect(() => {
    const zone = zoneRef.current;
    const onActiveChange = (active: DropZone | null) => {
      if (active !== zone) resetOver();
    };
    overListeners.add(onActiveChange);
    document.addEventListener("dragend", leaveZone);
    return () => {
      overListeners.delete(onActiveChange);
      document.removeEventListener("dragend", leaveZone);
      if (activeDropZone === zone) setActiveDropZone(null);
    };
  }, [leaveZone, resetOver]);

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasDragMime(event.dataTransfer, mimeType)) return;
      event.preventDefault();
      claimZone();
      noteDropAutoScroll(event.currentTarget, event.clientX, event.clientY);
    },
    [claimZone, mimeType],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasDragMime(event.dataTransfer, mimeType)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      claimZone();
      noteDropAutoScroll(event.currentTarget, event.clientX, event.clientY);
      if (!itemSelector) return;
      const insert = readInsert(event.currentTarget, event, itemSelector, axis);
      const resolvePlaceholder =
        sortable && typeof sortable === "object"
          ? sortable.resolvePlaceholder
          : undefined;
      const next = resolvePlaceholder
        ? resolvePlaceholder(event, insert)
        : defaultPlaceholder(insert, axis);
      if (next !== undefined) setPlaceholderIfChanged(next);
      onDragOver?.(event);
    },
    [
      axis,
      claimZone,
      itemSelector,
      mimeType,
      onDragOver,
      setPlaceholderIfChanged,
      sortable,
    ],
  );

  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (stillInside(event.currentTarget, event)) return;
      stopDropAutoScroll(event.currentTarget);
      leaveZone();
    },
    [leaveZone],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasDragMime(event.dataTransfer, mimeType)) return;
      event.preventDefault();
      const nextIndex = itemSelector
        ? readInsert(event.currentTarget, event, itemSelector, axis).destIndex
        : undefined;
      stopDropAutoScroll();
      leaveZone();
      const data = getDragData<T>(event.dataTransfer, mimeType);
      if (data === null) return;
      if (canDrop && !canDrop(data)) return;
      onDrop(data, event, nextIndex);
    },
    [axis, canDrop, itemSelector, mimeType, onDrop, leaveZone],
  );

  return {
    isOver,
    placeholder,
    dropProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
