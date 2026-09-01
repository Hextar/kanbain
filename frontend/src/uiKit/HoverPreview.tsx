"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";

const GUTTER = 8;
const OFFSET = 10;
const SHOW_DELAY_MS = 350;
const HIDE_DELAY_MS = 120;
const SKIP_DELAY_MS = 300;

let skipDelayUntil = 0;

type HoverPreviewProps = {
  content: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
};

export default function HoverPreview({
  content,
  children,
  disabled = false,
  className,
  wrapperClassName,
}: HoverPreviewProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef(0);
  const hideTimerRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  if (disabled && open) setOpen(false);
  const visible = open && !disabled;

  function clearShowTimer() {
    window.clearTimeout(showTimerRef.current);
    showTimerRef.current = 0;
  }

  function clearHideTimer() {
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = 0;
  }

  function reveal() {
    if (disabled) return;
    clearHideTimer();
    setOpen(true);
    skipDelayUntil = Date.now() + SKIP_DELAY_MS;
  }

  function scheduleShow(delayMs: number) {
    if (disabled) return;
    clearHideTimer();
    clearShowTimer();
    if (delayMs <= 0) {
      reveal();
      return;
    }
    showTimerRef.current = window.setTimeout(reveal, delayMs);
  }

  function hide() {
    clearShowTimer();
    clearHideTimer();
    setOpen((current) => {
      if (current) skipDelayUntil = Date.now() + SKIP_DELAY_MS;
      return false;
    });
  }

  function scheduleHide() {
    clearShowTimer();
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(hide, HIDE_DELAY_MS);
  }

  useEffect(
    () => () => {
      clearShowTimer();
      clearHideTimer();
    },
    [],
  );

  useLayoutEffect(() => {
    if (!visible) return;

    function place() {
      const trigger = triggerRef.current;
      const tip = tipRef.current;
      if (!trigger || !tip) return;
      const rect = trigger.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      const maxLeft = window.innerWidth - tipRect.width - GUTTER;
      const maxTop = window.innerHeight - tipRect.height - GUTTER;
      const fitsRight =
        rect.right + OFFSET + tipRect.width <= window.innerWidth - GUTTER;
      const fitsLeft = rect.left - OFFSET - tipRect.width >= GUTTER;
      const left = Math.min(
        Math.max(
          GUTTER,
          fitsRight
            ? rect.right + OFFSET
            : fitsLeft
              ? rect.left - OFFSET - tipRect.width
              : rect.left,
        ),
        Math.max(GUTTER, maxLeft),
      );
      const top = Math.min(
        Math.max(GUTTER, rect.top),
        Math.max(GUTTER, maxTop),
      );
      setCoords({ top, left });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      clearShowTimer();
      clearHideTimer();
      setOpen(false);
    }

    place();
    const observer = new ResizeObserver(place);
    if (tipRef.current) observer.observe(tipRef.current);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [visible]);

  return (
    <div
      ref={triggerRef}
      className={twMerge("min-w-0", wrapperClassName)}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        hide();
      }}
      onFocusCapture={() => scheduleShow(0)}
      onPointerDown={hide}
      onPointerEnter={() =>
        scheduleShow(Date.now() < skipDelayUntil ? 0 : SHOW_DELAY_MS)
      }
      onPointerLeave={scheduleHide}
    >
      {children}
      {visible
        ? createPortal(
            <div
              ref={tipRef}
              aria-hidden
              className={twMerge(
                "fixed z-[80]",
                coords ? "opacity-100" : "pointer-events-none opacity-0",
                className,
              )}
              onPointerEnter={() => {
                clearHideTimer();
              }}
              onPointerLeave={scheduleHide}
              style={
                coords
                  ? { top: coords.top, left: coords.left }
                  : { top: 0, left: 0 }
              }
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
