"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { twMerge } from "tailwind-merge";
import IconButton from "./IconButton";

export type ChipProps = {
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
};

export default function Chip({
  children,
  onRemove,
  removeLabel = "Remove",
  className,
}: ChipProps) {
  return (
    <span
      className={twMerge(
        "inline-flex max-w-full items-center gap-1 rounded-full bg-zinc-800/80 py-0.5 pr-0.5 pl-2 text-xs text-zinc-200 ring-1 ring-white/8",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-1">{children}</span>
      {onRemove ? (
        <IconButton
          aria-label={removeLabel}
          className="size-5 text-zinc-400"
          size="xs"
          type="button"
          variant="secondary"
          onClick={onRemove}
        >
          <X size={12} />
        </IconButton>
      ) : null}
    </span>
  );
}
