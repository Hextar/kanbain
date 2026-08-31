"use client";

import { useCallback, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  DND_ITEM_SELECTOR,
  clearDragSources,
  markDragSource,
  setDragData,
  setDragImageAtCursor,
} from "./html5DnD";

type UseHtml5DragOptions<T> = {
  data: T;
  mimeType: string;
  disabled?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLElement>) => void;
};

export function useHtml5Drag<T>({
  data,
  mimeType,
  disabled = false,
  onDragStart,
  onDragEnd,
}: UseHtml5DragOptions<T>) {
  const [isDragging, setIsDragging] = useState(false);
  const dragFrameRef = useRef(0);

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = "move";
      const source =
        event.currentTarget.closest<HTMLElement>(DND_ITEM_SELECTOR) ??
        event.currentTarget;
      const rect = source.getBoundingClientRect();
      markDragSource(
        source,
        { width: rect.width, height: rect.height },
        mimeType,
      );
      setDragData(event.dataTransfer, mimeType, data);
      setDragImageAtCursor(
        event.dataTransfer,
        source,
        event.clientX,
        event.clientY,
      );
      onDragStart?.(event);
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = requestAnimationFrame(() => {
        setIsDragging(true);
      });
    },
    [data, disabled, mimeType, onDragStart],
  );

  const handleDragEnd = useCallback(
    (event: DragEvent<HTMLElement>) => {
      cancelAnimationFrame(dragFrameRef.current);
      clearDragSources();
      setIsDragging(false);
      onDragEnd?.(event);
    },
    [onDragEnd],
  );

  return {
    isDragging,
    dragProps: {
      draggable: !disabled,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
  };
}
