"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";

type TooltipAlign = "start" | "center" | "end";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  align?: TooltipAlign;
  className?: string;
  wrapperClassName?: string;
};

const GUTTER = 8;
const OFFSET = 6;
const SHOW_DELAY_MS = 400;
const SKIP_DELAY_MS = 300;

let skipDelayUntil = 0;

export default function Tooltip({
  content,
  children,
  align = "center",
  className,
  wrapperClassName,
}: TooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<number>(0);
  const openRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  function clearShowTimer() {
    window.clearTimeout(showTimerRef.current);
    showTimerRef.current = 0;
  }

  function reveal() {
    setOpen(true);
    skipDelayUntil = Date.now() + SKIP_DELAY_MS;
  }

  function scheduleShow(delayMs: number) {
    clearShowTimer();
    if (delayMs <= 0) {
      reveal();
      return;
    }
    showTimerRef.current = window.setTimeout(reveal, delayMs);
  }

  function hide() {
    clearShowTimer();
    if (openRef.current) skipDelayUntil = Date.now() + SKIP_DELAY_MS;
    setOpen(false);
  }

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => () => clearShowTimer(), []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function place() {
      const trigger = triggerRef.current;
      const tip = tipRef.current;
      if (!trigger || !tip) return;
      const rect = trigger.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      let left =
        align === "start"
          ? rect.left
          : align === "end"
            ? rect.right - tipRect.width
            : rect.left + rect.width / 2 - tipRect.width / 2;
      let top = rect.bottom + OFFSET;
      left = Math.min(
        Math.max(GUTTER, left),
        window.innerWidth - tipRect.width - GUTTER,
      );
      if (top + tipRect.height > window.innerHeight - GUTTER) {
        top = Math.max(GUTTER, rect.top - tipRect.height - OFFSET);
      }
      setCoords({ top, left });
    }

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [align, content, open]);

  const trigger = isValidElement<{ "aria-describedby"?: string }>(children)
    ? cloneElement(children, {
        "aria-describedby": [children.props["aria-describedby"], tooltipId]
          .filter(Boolean)
          .join(" "),
      })
    : children;

  return (
    <span
      ref={triggerRef}
      className={twMerge("inline-flex max-w-full", wrapperClassName)}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        hide();
      }}
      onFocusCapture={() => scheduleShow(0)}
      onPointerEnter={() =>
        scheduleShow(Date.now() < skipDelayUntil ? 0 : SHOW_DELAY_MS)
      }
      onPointerLeave={hide}
    >
      {trigger}
      {open
        ? createPortal(
            <span
              ref={tipRef}
              className={twMerge(
                "pointer-events-none fixed z-[80] w-max max-w-56 rounded-md bg-zinc-950 px-2.5 py-1.5 text-left text-xs leading-5 break-words text-zinc-100 shadow-lg ring-1 ring-zinc-700",
                coords ? "opacity-100" : "opacity-0",
                className,
              )}
              id={tooltipId}
              role="tooltip"
              style={
                coords
                  ? { top: coords.top, left: coords.left }
                  : { top: 0, left: 0 }
              }
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
