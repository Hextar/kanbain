import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const SIZE_CLASS = {
  sm: "inline-flex size-6 items-center justify-center rounded-full text-[10px] font-medium",
  md: "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-semibold tracking-wide",
} as const;

export type AvatarSize = keyof typeof SIZE_CLASS;

export type AvatarProps = {
  initials: string;
  size?: AvatarSize;
  className?: string;
  children?: ReactNode;
};

export default function Avatar({
  initials,
  size = "sm",
  className,
  children,
}: AvatarProps) {
  return (
    <span className={twMerge(SIZE_CLASS[size], className)}>
      {children}
      <span className={size === "md" ? "relative" : undefined}>{initials}</span>
    </span>
  );
}

export type AvatarStackProps = {
  children: ReactNode;
  extra?: number;
  className?: string;
};

export function AvatarStack({
  children,
  extra = 0,
  className,
}: AvatarStackProps) {
  return (
    <span className={twMerge("inline-flex items-center pl-1", className)}>
      {children}
      {extra > 0 ? (
        <span className="-ml-1.5 inline-flex size-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-400 ring-2 ring-[#181b24]">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}
