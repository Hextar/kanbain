"use client";

import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

type SelectProps = ComponentProps<"select">;

export default function Select({ className, ...props }: SelectProps) {
  return (
    <div className="relative w-full min-w-0">
      <select
        className={twMerge(
          "box-border h-8 max-h-8 min-h-8 w-full cursor-pointer appearance-none rounded-md border border-white/8 bg-[#12141c] py-0 pr-8 pl-2.5 text-sm text-zinc-100 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-zinc-500"
      />
    </div>
  );
}
