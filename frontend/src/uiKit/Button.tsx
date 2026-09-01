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

const SHINE = "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.22)]";

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
          "outline outline-purple-500 text-purple-300 bg-transparent hover:bg-gradient-to-br hover:from-violet-400 hover:to-purple-600 hover:text-white hover:outline-transparent";
      } else if (kind === "ghost") {
        colorStyles =
          "bg-transparent text-purple-400 hover:bg-purple-500/15 hover:text-purple-300";
      } else {
        colorStyles = twMerge(
          "bg-gradient-to-br from-violet-400 to-purple-600 text-white hover:from-violet-300 hover:to-purple-500",
          SHINE,
        );
      }
      break;
    case "secondary":
      if (kind === "outline") {
        colorStyles =
          "outline outline-white/15 text-zinc-300 bg-transparent hover:bg-gradient-to-br hover:from-zinc-600 hover:to-zinc-700 hover:text-white hover:outline-transparent";
      } else if (kind === "ghost") {
        colorStyles =
          "bg-transparent text-zinc-400 hover:bg-zinc-700 hover:text-white";
      } else {
        colorStyles = twMerge(
          "bg-gradient-to-br from-zinc-500 to-zinc-700 text-white hover:from-zinc-400 hover:to-zinc-600",
          SHINE,
        );
      }
      break;
    case "danger":
    default:
      if (kind === "outline") {
        colorStyles =
          "outline outline-rose-500 text-rose-300 bg-transparent hover:bg-gradient-to-br hover:from-rose-400 hover:to-red-600 hover:text-white hover:outline-transparent";
      } else if (kind === "ghost") {
        colorStyles =
          "bg-transparent text-red-400 hover:bg-red-500/15 hover:text-red-300";
      } else {
        colorStyles = twMerge(
          "bg-gradient-to-br from-rose-400 to-red-600 text-white hover:from-rose-300 hover:to-red-500",
          SHINE,
        );
      }
      break;
  }

  const reactiveStyles = props.disabled
    ? "pointer-events-none opacity-50"
    : "transition-[color,background-color,box-shadow,filter] cursor-pointer";

  let sizeStyles: string;
  switch (size) {
    case "xs":
      sizeStyles = "text-xs px-2 py-1";
      break;
    case "sm":
      sizeStyles = "text-sm px-3 py-2";
      break;
    case "md":
      sizeStyles = "text-sm px-4 py-2";
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
        "inline-flex items-center justify-center gap-1.5 rounded-md focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
        sizeStyles,
        colorStyles,
        reactiveStyles,
        className,
      )}
      onClick={() => _onClick(props.disabled, onClick)}
    />
  );
}
