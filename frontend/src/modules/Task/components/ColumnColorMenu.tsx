"use client";

import { useCallback, useState } from "react";
import ColorSwatch from "@uiKit/ColorSwatch";
import PopoverPanel, { Popover } from "@uiKit/PopoverPanel";
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
  const close = useCallback(() => setOpen(false), []);

  return (
    <Popover
      className="flex size-7 shrink-0 items-center justify-center"
      open={open}
      onClose={close}
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
        <span className={`size-2 rounded-full ${accent.dot}`} />
      </button>
      {open ? (
        <PopoverPanel
          align="start"
          aria-label="Column color"
          className="w-40 p-2"
          role="listbox"
        >
          <div className="relative grid grid-cols-5 gap-1.5">
            {COLUMN_COLOR_OPTIONS.map((option) => (
              <ColorSwatch
                key={option.id}
                colorClassName={option.dot}
                label={option.label}
                selected={option.id === accent.id}
                onClick={() => {
                  onChange(option.id);
                  close();
                }}
              />
            ))}
          </div>
        </PopoverPanel>
      ) : null}
    </Popover>
  );
}
