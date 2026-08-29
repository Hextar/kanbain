"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  DND_ITEM_SELECTOR,
  getDragData,
  getVerticalInsert,
  hasDragMime,
  type DropPlaceholder,
} from "./html5DnD";

type SortableOptions = {
  itemSelector?: string;
};

type UseHtml5DropOptions<T> = {
  mimeType: string;
  onDrop: (
    data: T,
    event: DragEvent<HTMLElement>,
    insertIndex?: number,
  ) => void;
  canDrop?: (data: T) => boolean;
  sortable?: boolean | SortableOptions;
};

function sortableItemSelector(
  sortable: UseHtml5DropOptions<unknown>["sortable"],
) {
  if (!sortable) return null;
  if (sortable === true) return DND_ITEM_SELECTOR;
  return sortable.itemSelector ?? DND_ITEM_SELECTOR;
}

function placeholdersEqual(
  left: DropPlaceholder | null,
  right: DropPlaceholder | null,
) {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.index === right.index && left.height === right.height;
}

export function useHtml5Drop<T>({
  mimeType,
  onDrop,
  canDrop,
  sortable,
}: UseHtml5DropOptions<T>) {
  const [isOver, setIsOver] = useState(false);
  const [placeholder, setPlaceholder] = useState<DropPlaceholder | null>(null);
  const enterCountRef = useRef(0);
  const placeholderRef = useRef<DropPlaceholder | null>(null);
  const itemSelector = sortableItemSelector(sortable);

  const setPlaceholderIfChanged = useCallback((next: DropPlaceholder | null) => {
    if (placeholdersEqual(placeholderRef.current, next)) return;
    placeholderRef.current = next;
    setPlaceholder(next);
  }, []);

  const resetOver = useCallback(() => {
    enterCountRef.current = 0;
    setIsOver(false);
    setPlaceholderIfChanged(null);
  }, [setPlaceholderIfChanged]);

  useEffect(() => {
    document.addEventListener("dragend", resetOver);
    return () => document.removeEventListener("dragend", resetOver);
  }, [resetOver]);

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasDragMime(event.dataTransfer, mimeType)) return;
      event.preventDefault();
      enterCountRef.current += 1;
      setIsOver(true);
    },
    [mimeType],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasDragMime(event.dataTransfer, mimeType)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (!itemSelector) return;
      const insert = getVerticalInsert(
        event.currentTarget,
        event.clientY,
        itemSelector,
      );
      setPlaceholderIfChanged(
        insert.visualIndex == null
          ? null
          : { index: insert.visualIndex, height: insert.previewHeight },
      );
    },
    [itemSelector, mimeType, setPlaceholderIfChanged],
  );

  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const related = event.relatedTarget;
      if (related instanceof Node && event.currentTarget.contains(related)) {
        return;
      }
      enterCountRef.current -= 1;
      if (enterCountRef.current <= 0) {
        resetOver();
      }
    },
    [resetOver],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasDragMime(event.dataTransfer, mimeType)) return;
      event.preventDefault();
      const nextIndex = itemSelector
        ? getVerticalInsert(
            event.currentTarget,
            event.clientY,
            itemSelector,
          ).destIndex
        : undefined;
      resetOver();
      const data = getDragData<T>(event.dataTransfer, mimeType);
      if (data === null) return;
      if (canDrop && !canDrop(data)) return;
      onDrop(data, event, nextIndex);
    },
    [canDrop, itemSelector, mimeType, onDrop, resetOver],
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
