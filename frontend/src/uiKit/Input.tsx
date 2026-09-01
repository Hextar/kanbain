"use client";

import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

type InputProps = ComponentProps<"input">;

export default function Input({ className, type, ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      type={type}
      className={twMerge(
        "flex w-full min-w-0 rounded-md border border-white/8 bg-[#12141c] px-2.5 py-2 text-sm text-zinc-100 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
