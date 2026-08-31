import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { DropPlaceholder } from "@libraries/dnd/html5DnD";
import TaskCardFrame from "./TaskCardFrame";

const SHADOW_MS = 200;
const COLUMN_GAP = "0.5rem";
const NESTED_GAP = "0.375rem";

export function useDropShadow(placeholder: DropPlaceholder | null) {
  const skipExitRef = useRef(false);
  const [slot, setSlot] = useState<DropPlaceholder | null>(null);
  const [open, setOpen] = useState(false);
  const index = placeholder?.index ?? null;
  const height = placeholder?.height ?? 0;

  const width = placeholder?.width ?? 0;

  const skipExitAnimation = useCallback(() => {
    skipExitRef.current = true;
  }, []);

  useLayoutEffect(() => {
    if (index != null) {
      skipExitRef.current = false;
      setSlot({ index, height, ...(width ? { width } : {}) });
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }
    if (skipExitRef.current) {
      skipExitRef.current = false;
      setOpen(false);
      setSlot(null);
      return;
    }
    setOpen(false);
    const timeout = window.setTimeout(() => setSlot(null), SHADOW_MS);
    return () => window.clearTimeout(timeout);
  }, [height, index, width]);

  return {
    slot,
    open,
    skipExitAnimation,
  };
}

export default function TaskDropShadow({
  height,
  open,
  compact = false,
}: {
  height: number;
  open: boolean;
  compact?: boolean;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none overflow-hidden transition-[height,margin-bottom] duration-200 ease-out motion-reduce:transition-none"
      data-dnd-placeholder=""
      style={{
        height: open ? height : 0,
        marginBottom: open ? 0 : compact ? `-${NESTED_GAP}` : `-${COLUMN_GAP}`,
      }}
    >
      <div className="box-border" style={{ height }}>
        {compact ? (
          <div className="h-full rounded-md border border-dashed border-zinc-500 bg-[#14161e]/50">
            {"\u00a0"}
          </div>
        ) : (
          <TaskCardFrame className="h-full border-dashed border-zinc-500 bg-[#14161e]/50 shadow-none">
            {"\u00a0"}
          </TaskCardFrame>
        )}
      </div>
    </div>
  );
}
