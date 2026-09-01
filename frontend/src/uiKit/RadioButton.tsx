"use client";

import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

type RadioButtonProps = {
  selected?: boolean;
  kind?: "outline" | "filled";
} & ComponentProps<"input">;

export default function RadioButton({
  kind = "filled",
  selected,
  children,
  className,
  ...props
}: RadioButtonProps) {
  const selectedBackgroundColor =
    kind === "outline"
      ? "outline-2 outline-purple-500 hover:outline-purple-600"
      : "bg-gradient-to-br from-violet-400 to-purple-600 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.22)] hover:from-violet-300 hover:to-purple-500";
  const unselectedBackgroundColor =
    kind === "outline"
      ? "outline-2 outline-zinc-500 hover:outline-zinc-600"
      : "bg-gradient-to-br from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800";
  const backgroundColor = selected
    ? selectedBackgroundColor
    : unselectedBackgroundColor;
  const selectedTextColor =
    kind === "outline" ? "text-purple-300" : "text-white";
  const unselectedTextColor =
    kind === "outline" ? "text-zinc-400" : "text-zinc-500";
  const textColor = selected ? selectedTextColor : unselectedTextColor;
  const reactiveStyles = props.disabled
    ? "opacity-50 pointer-events-none"
    : "transition-[color,background-color,box-shadow] cursor-pointer";

  return (
    <label
      className={twMerge(
        `rounded-md px-4 py-2 ${backgroundColor} ${textColor} ${reactiveStyles}`,
        className,
      )}
    >
      <input
        {...props}
        type="radio"
        name="day-select"
        className="peer pointer-events-none sr-only h-0 w-0"
        checked={selected}
        readOnly
      />
      <span className={`flex flex-1 ${textColor} ${reactiveStyles}`}>
        {children}
      </span>
    </label>
  );
}
