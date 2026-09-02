import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const SIZE_CLASS = {
  page: "flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center",
  panel:
    "flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center",
  compact: "flex flex-col items-start gap-4 p-6",
} as const;

const TITLE_CLASS = {
  page: "text-2xl font-semibold text-white",
  panel: "text-lg font-semibold text-pretty text-white",
  compact: "text-2xl font-bold text-white",
} as const;

const ICON_WELL_CLASS = {
  page: "relative flex size-16 items-center justify-center rounded-2xl border border-white/8 bg-[#181b24] text-purple-300",
  panel:
    "flex size-12 items-center justify-center rounded-2xl border border-white/8 bg-[#181b24] text-purple-300",
} as const;

export type EmptyStateSize = keyof typeof SIZE_CLASS;

export type EmptyStateProps = {
  title: string;
  body?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  size?: EmptyStateSize;
  glow?: boolean;
  className?: string;
  id?: string;
  role?: string;
  "aria-labelledby"?: string;
};

export default function EmptyState({
  title,
  body,
  icon,
  action,
  size = "panel",
  glow = false,
  className,
  id,
  role,
  "aria-labelledby": ariaLabelledBy,
}: EmptyStateProps) {
  const wellClass =
    size === "compact"
      ? undefined
      : ICON_WELL_CLASS[size === "page" ? "page" : "panel"];

  return (
    <div
      aria-labelledby={ariaLabelledBy}
      className={twMerge(SIZE_CLASS[size], className)}
      id={id}
      role={role}
    >
      {icon && wellClass ? (
        <div className={glow ? "relative" : undefined}>
          {glow ? (
            <div
              aria-hidden
              className="absolute inset-0 -m-6 rounded-full bg-gradient-to-br from-purple-500/20 to-transparent blur-2xl"
            />
          ) : null}
          <div className={wellClass}>{icon}</div>
        </div>
      ) : icon ? (
        icon
      ) : null}
      <div
        className={twMerge(
          "flex flex-col gap-2",
          size === "page" ? "max-w-md" : size === "panel" ? "max-w-sm" : null,
        )}
      >
        <h2 className={TITLE_CLASS[size]}>{title}</h2>
        {body ? (
          <div
            className={
              size === "compact"
                ? "text-zinc-400"
                : "text-sm leading-6 text-zinc-400"
            }
          >
            {body}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
