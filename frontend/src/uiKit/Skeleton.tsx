import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

type SkeletonProps = ComponentProps<"div">;

export default function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={twMerge(
        "rounded-md bg-white/8 motion-safe:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}
