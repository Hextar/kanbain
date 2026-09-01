"use client";

import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

type TextareaProps = ComponentProps<"textarea">;

export default function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={twMerge(
        "flex min-h-28 w-full flex-1 resize-y rounded-md border border-white/8 bg-[#12141c] px-2.5 py-2 text-sm text-zinc-100 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
