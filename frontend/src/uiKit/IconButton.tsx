"use client";

import { twMerge } from "tailwind-merge";
import Button, { type ButtonProps } from "./Button";

const squareSizeStyles = {
  xs: "size-7",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
} as const;

export type IconButtonProps = ButtonProps;

export default function IconButton({
  className,
  kind = "ghost",
  size = "md",
  ...props
}: IconButtonProps) {
  return (
    <Button
      {...props}
      kind={kind}
      size={size}
      className={twMerge(
        "inline-flex aspect-square items-center justify-center p-0",
        squareSizeStyles[size],
        className,
      )}
    />
  );
}
