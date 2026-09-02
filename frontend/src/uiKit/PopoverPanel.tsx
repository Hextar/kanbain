"use client";

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import LightOrb from "./LightOrb";

const PANEL_CLASS =
  "glass-overlay light-edge light-edge-card isolate absolute top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-white/10 shadow-xl shadow-black/50";

export type PopoverProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  dismissOnEscape?: boolean;
};

export function Popover({
  open,
  onClose,
  children,
  className,
  dismissOnEscape = true,
}: PopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (!dismissOnEscape || event.key !== "Escape") return;
      onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dismissOnEscape, onClose, open]);

  return (
    <div ref={rootRef} className={twMerge("relative", className)}>
      {children}
    </div>
  );
}

export type PopoverPanelProps = ComponentProps<"div"> & {
  align?: "start" | "end";
  children: ReactNode;
};

export default function PopoverPanel({
  align = "end",
  className,
  children,
  ...props
}: PopoverPanelProps) {
  return (
    <div
      {...props}
      className={twMerge(
        PANEL_CLASS,
        align === "start" ? "left-0" : "right-0",
        className,
      )}
      data-light-edge=""
    >
      <LightOrb />
      {children}
    </div>
  );
}
