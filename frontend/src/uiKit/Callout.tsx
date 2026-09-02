import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const TONE_CLASS = {
  ok: "flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300",
  warn: "flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200",
  danger: "rounded-xl bg-red-500/15 px-3 py-2.5 text-sm text-red-300",
  muted:
    "flex items-start gap-2.5 rounded-xl border border-white/8 bg-[#14161e]/55 px-3 py-2.5 text-sm text-zinc-400 backdrop-blur-sm",
} as const;

const TITLE_CLASS = {
  ok: "font-medium text-emerald-100",
  warn: "font-medium text-zinc-200",
  danger: "font-medium text-red-200",
  muted: "font-medium text-zinc-200",
} as const;

const BODY_CLASS = {
  ok: "text-emerald-300/80",
  warn: "text-zinc-400",
  danger: "text-red-300/90",
  muted: "text-zinc-400",
} as const;

export type CalloutTone = keyof typeof TONE_CLASS;

export type CalloutProps = {
  tone?: CalloutTone;
  title?: string;
  body?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export default function Callout({
  tone = "muted",
  title,
  body,
  icon,
  children,
  className,
}: CalloutProps) {
  const role = tone === "ok" ? "status" : "alert";

  if (!title && !body && children) {
    return (
      <div className={twMerge(TONE_CLASS[tone], className)} role={role}>
        {children}
      </div>
    );
  }

  return (
    <div className={twMerge(TONE_CLASS[tone], className)} role={role}>
      {icon ? (
        <span className="mt-0.5 shrink-0" aria-hidden>
          {icon}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? <p className={TITLE_CLASS[tone]}>{title}</p> : null}
        {body ? <div className={BODY_CLASS[tone]}>{body}</div> : null}
        {children}
      </div>
    </div>
  );
}
