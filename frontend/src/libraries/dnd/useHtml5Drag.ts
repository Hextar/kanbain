"use client";

import { useCallback, useState } from "react";
import type { DragEvent } from "react";
import { setDragData, setDragImageAtCursor } from "./html5DnD";

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

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = "move";
      setDragData(event.dataTransfer, mimeType, data);
      setDragImageAtCursor(
        event.dataTransfer,
        event.currentTarget,
        event.clientX,
        event.clientY,
      );
      setIsDragging(true);
      onDragStart?.(event);
    },
    [data, disabled, mimeType, onDragStart],
  );

  const handleDragEnd = useCallback(
    (event: DragEvent<HTMLElement>) => {
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
