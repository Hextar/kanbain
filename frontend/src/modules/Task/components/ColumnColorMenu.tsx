"use client";

import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import LightOrb from "@uiKit/LightOrb";
import {
  COLUMN_COLOR_OPTIONS,
  type ColumnAccent,
  type ColumnColorId,
} from "../helpers/columnAccent";

type ColumnColorMenuProps = {
  accent: ColumnAccent;
  columnTitle: string;
  disabled?: boolean;
  onChange: (color: ColumnColorId) => void;
};

export default function ColumnColorMenu({
  accent,
  columnTitle,
  disabled = false,
  onChange,
}: ColumnColorMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative flex size-7 shrink-0 items-center justify-center"
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Change ${columnTitle} color`}
        className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none disabled:opacity-50"
        disabled={disabled}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={twMerge("size-2 rounded-full", accent.dot)} />
      </button>
      {open ? (
        <div
          aria-label="Column color"
          className="glass-overlay light-edge light-edge-card isolate absolute top-full left-0 z-50 mt-1.5 w-40 overflow-hidden rounded-xl border border-white/10 p-2 shadow-xl shadow-black/50"
          data-light-edge=""
          role="listbox"
        >
          <LightOrb />
          <div className="relative grid grid-cols-5 gap-1.5">
            {COLUMN_COLOR_OPTIONS.map((option) => {
              const selected = option.id === accent.id;
              return (
                <button
                  key={option.id}
                  aria-label={option.label}
                  aria-selected={selected}
                  className="flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
                  role="option"
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className={twMerge(
                      "size-3.5 rounded-full",
                      option.dot,
                      selected &&
                        "ring-2 ring-white ring-offset-2 ring-offset-[#181b24]",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
