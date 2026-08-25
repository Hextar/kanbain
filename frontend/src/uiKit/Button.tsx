"use client";

import type { ComponentProps, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type ButtonProps = {
  children: ReactNode;
  ariaLabel?: string;
  kind?: "outline" | "filled" | "ghost";
  variant?: "primary" | "secondary" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  onClick?: () => void;
} & ComponentProps<"button">;

function _onClick(disabled: boolean | undefined, onClick?: () => void) {
  if (disabled) return;
  onClick?.();
}

export default function Button({
  ref,
  variant = "primary",
  size = "md",
  kind = "filled",
  onClick,
  className,
  ...props
}: ButtonProps) {
  let colorStyles: string;
  switch (variant) {
    case "primary":
      if (kind === "outline") {
        colorStyles =
          "outline outline-purple-500 text-purple-500 bg-transparent hover:bg-purple-500 hover:text-white";
      } else if (kind === "ghost") {
        colorStyles =
          "bg-transparent text-purple-400 hover:bg-purple-500/15 hover:text-purple-300";
      } else {
        colorStyles = "bg-purple-500 hover:bg-purple-600 text-white";
      }
      break;
    case "secondary":
      if (kind === "outline") {
        colorStyles =
          "outline outline-gray-500 text-gray-500 bg-transparent hover:bg-gray-500 hover:text-white";
      } else if (kind === "ghost") {
        colorStyles =
          "bg-transparent text-zinc-400 hover:bg-zinc-700 hover:text-white";
      } else {
        colorStyles = "bg-gray-500 hover:bg-gray-600 text-white";
      }
      break;
    case "danger":
    default:
      if (kind === "outline") {
        colorStyles =
          "outline outline-red-500 text-red-500 bg-transparent hover:bg-red-500 hover:text-white";
      } else if (kind === "ghost") {
        colorStyles =
          "bg-transparent text-red-400 hover:bg-red-500/15 hover:text-red-300";
      } else {
        colorStyles = "bg-red-500 hover:bg-red-600 text-white";
      }
      break;
  }

  const reactiveStyles = props.disabled
    ? "pointer-events-none opacity-50"
    : "transition-colors cursor-pointer";

  let sizeStyles: string;
  switch (size) {
    case "xs":
      sizeStyles = "text-xs px-2 py-1";
      break;
    case "sm":
      sizeStyles = "text-sm px-3 py-2";
      break;
    case "md":
      sizeStyles = "text-md px-4 py-2";
      break;
    case "lg":
    default:
      sizeStyles = "text-lg px-5 py-3";
      break;
  }

  return (
    <button
      {...props}
      ref={ref}
      className={twMerge(
        `rounded-md text-white ${sizeStyles} ${colorStyles} ${reactiveStyles}`,
        className,
      )}
      onClick={() => _onClick(props.disabled, onClick)}
    />
  );
}
