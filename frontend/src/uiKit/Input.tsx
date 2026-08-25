"use client";

import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

type InputProps = ComponentProps<"input">;

export default function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={twMerge(
        "flex flex-1 rounded-md bg-zinc-800 px-4 py-2 text-white focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
