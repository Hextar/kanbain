"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { getDragData, hasDragMime } from "./html5DnD";

type UseHtml5DropOptions<T> = {
  mimeType: string;
  onDrop: (data: T, event: DragEvent<HTMLElement>) => void;
  canDrop?: (data: T) => boolean;
};

export function useHtml5Drop<T>({
  mimeType,
  onDrop,
  canDrop,
}: UseHtml5DropOptions<T>) {
  const [isOver, setIsOver] = useState(false);
  const enterCountRef = useRef(0);

  const resetOver = useCallback(() => {
    enterCountRef.current = 0;
    setIsOver(false);
  }, []);

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
    },
    [mimeType],
  );

  const handleDragLeave = useCallback(() => {
    enterCountRef.current -= 1;
    if (enterCountRef.current <= 0) {
      resetOver();
    }
  }, [resetOver]);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasDragMime(event.dataTransfer, mimeType)) return;
      event.preventDefault();
      resetOver();
      const data = getDragData<T>(event.dataTransfer, mimeType);
      if (data === null) return;
      if (canDrop && !canDrop(data)) return;
      onDrop(data, event);
    },
    [canDrop, mimeType, onDrop, resetOver],
  );

  return {
    isOver,
    dropProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
