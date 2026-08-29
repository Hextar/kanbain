"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  DND_ITEM_SELECTOR,
  getDragData,
  getVerticalInsert,
  hasDragMime,
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

export function useHtml5Drop<T>({
  mimeType,
  onDrop,
  canDrop,
  sortable,
}: UseHtml5DropOptions<T>) {
  const [isOver, setIsOver] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [visualInsertIndex, setVisualInsertIndex] = useState<number | null>(
    null,
  );
  const enterCountRef = useRef(0);
  const insertIndexRef = useRef<number | null>(null);
  const visualInsertIndexRef = useRef<number | null>(null);
  const itemSelector = sortableItemSelector(sortable);

  const setInsertIfChanged = useCallback(
    (destIndex: number | null, visualIndex: number | null) => {
      if (
        insertIndexRef.current === destIndex &&
        visualInsertIndexRef.current === visualIndex
      ) {
        return;
      }
      insertIndexRef.current = destIndex;
      visualInsertIndexRef.current = visualIndex;
      setInsertIndex(destIndex);
      setVisualInsertIndex(visualIndex);
    },
    [],
  );

  const resetOver = useCallback(() => {
    enterCountRef.current = 0;
    setIsOver(false);
    setInsertIfChanged(null, null);
  }, [setInsertIfChanged]);

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
      setInsertIfChanged(insert.destIndex, insert.visualIndex);
    },
    [itemSelector, mimeType, setInsertIfChanged],
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
    insertIndex,
    visualInsertIndex,
    dropProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
