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

type AnchoredHoverPreviewProps = {
  content: ReactNode;
  anchor: Element | null;
  immediate?: boolean;
  disabled?: boolean;
  className?: string;
};

export default function HoverPreview({
  content,
  children,
  disabled = false,
  className,
  wrapperClassName,
}: HoverPreviewProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const preview = useHoverPreview(disabled);

  return (
    <div
      ref={triggerRef}
      className={twMerge("min-w-0", wrapperClassName)}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        preview.hide();
      }}
      onFocusCapture={() => preview.scheduleShow(0)}
      onPointerDown={preview.hide}
      onPointerEnter={() =>
        preview.scheduleShow(Date.now() < skipDelayUntil ? 0 : SHOW_DELAY_MS)
      }
      onPointerLeave={preview.scheduleHide}
    >
      {children}
      <HoverPreviewTip
        className={className}
        content={content}
        getTriggerRect={() =>
          triggerRef.current?.getBoundingClientRect() ?? null
        }
        onEscape={preview.hide}
        onTipEnter={preview.clearHideTimer}
        onTipLeave={preview.scheduleHide}
        visible={preview.visible}
      />
    </div>
  );
}

export function AnchoredHoverPreview({
  content,
  anchor,
  immediate = false,
  disabled = false,
  className,
}: AnchoredHoverPreviewProps) {
  const preview = useHoverPreview(disabled);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;

  useEffect(() => {
    if (disabled) {
      previewRef.current.hide();
      return;
    }
    if (anchor) {
      previewRef.current.scheduleShow(
        immediate || Date.now() < skipDelayUntil ? 0 : SHOW_DELAY_MS,
      );
      return;
    }
    previewRef.current.scheduleHide();
  }, [anchor, disabled, immediate]);

  return (
    <HoverPreviewTip
      className={className}
      content={content}
      getTriggerRect={() => anchorRef.current?.getBoundingClientRect() ?? null}
      onEscape={preview.hide}
      onTipEnter={preview.clearHideTimer}
      onTipLeave={preview.scheduleHide}
      trackAnchor
      visible={preview.visible}
    />
  );
}

function useHoverPreview(disabled: boolean) {
  const showTimerRef = useRef(0);
  const hideTimerRef = useRef(0);
  const [open, setOpen] = useState(false);
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

  return {
    visible,
    scheduleShow,
    scheduleHide,
    hide,
    clearHideTimer,
  };
}

function HoverPreviewTip({
  visible,
  content,
  className,
  getTriggerRect,
  trackAnchor = false,
  onEscape,
  onTipEnter,
  onTipLeave,
}: {
  visible: boolean;
  content: ReactNode;
  className?: string;
  getTriggerRect: () => DOMRect | null;
  trackAnchor?: boolean;
  onEscape: () => void;
  onTipEnter: () => void;
  onTipLeave: () => void;
}) {
  const tipRef = useRef<HTMLDivElement>(null);
  const getTriggerRectRef = useRef(getTriggerRect);
  const onEscapeRef = useRef(onEscape);
  getTriggerRectRef.current = getTriggerRect;
  onEscapeRef.current = onEscape;
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!visible) {
      setCoords(null);
      return;
    }

    function place() {
      const rect = getTriggerRectRef.current();
      const tip = tipRef.current;
      if (!rect || !tip) return;
      const next = computePreviewCoords(rect, tip.getBoundingClientRect());
      setCoords((prev) =>
        prev && prev.top === next.top && prev.left === next.left ? prev : next,
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onEscapeRef.current();
    }

    place();
    const observer = new ResizeObserver(place);
    if (tipRef.current) observer.observe(tipRef.current);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    window.addEventListener("keydown", onKeyDown);
    let raf = 0;
    if (trackAnchor) {
      const loop = () => {
        place();
        raf = window.requestAnimationFrame(loop);
      };
      raf = window.requestAnimationFrame(loop);
    }
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [trackAnchor, visible]);

  if (!visible) return null;
  return createPortal(
    <div
      ref={tipRef}
      aria-hidden
      className={twMerge(
        "fixed z-[80]",
        coords ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
      onPointerEnter={onTipEnter}
      onPointerLeave={onTipLeave}
      style={
        coords ? { top: coords.top, left: coords.left } : { top: 0, left: 0 }
      }
    >
      {content}
    </div>,
    document.body,
  );
}

function computePreviewCoords(rect: DOMRect, tipRect: DOMRect) {
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
  const top = Math.min(Math.max(GUTTER, rect.top), Math.max(GUTTER, maxTop));
  return { top, left };
}
