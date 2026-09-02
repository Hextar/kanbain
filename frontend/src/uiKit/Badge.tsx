"use client";

import type { ComponentProps, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export const BADGE_CLASS_NAME =
  "rounded-full px-1.5 py-px text-[10px] font-medium tracking-wide";

const TONE_CLASS = {
  default: BADGE_CLASS_NAME,
  muted:
    "rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-400 ring-1 ring-white/6",
  danger: "rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-300",
  count:
    "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] leading-none font-medium tabular-nums select-none",
} as const;

export type BadgeTone = keyof typeof TONE_CLASS;

export type BadgeProps = ComponentProps<"span"> & {
  tone?: BadgeTone;
  children: ReactNode;
};

export default function Badge({
  tone = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={twMerge(TONE_CLASS[tone], className)} {...props}>
      {children}
    </span>
  );
}
