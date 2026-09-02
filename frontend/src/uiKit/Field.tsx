"use client";

import type { ComponentProps, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export const FIELD_LABEL_CLASS =
  "text-[11px] font-medium tracking-wide text-zinc-500";

export type FieldLabelProps = ComponentProps<"label"> & {
  as?: "label" | "span";
};

export function FieldLabel({
  as,
  htmlFor,
  className,
  children,
  ...props
}: FieldLabelProps) {
  const classNames = twMerge(FIELD_LABEL_CLASS, className);
  if ((as ?? (htmlFor ? "label" : "span")) === "label") {
    return (
      <label {...props} className={classNames} htmlFor={htmlFor}>
        {children}
      </label>
    );
  }
  return <span className={classNames}>{children}</span>;
}

export type FieldProps = {
  label: string;
  htmlFor?: string;
  align?: "center" | "start";
  children: ReactNode;
  className?: string;
};

export default function Field({
  label,
  htmlFor,
  align = "center",
  children,
  className,
}: FieldProps) {
  return (
    <div
      className={twMerge(
        "grid grid-cols-[5.75rem_minmax(0,1fr)] gap-x-3 gap-y-1",
        align === "start" ? "items-start" : "items-center",
        className,
      )}
    >
      <FieldLabel
        className={align === "start" ? "pt-2" : undefined}
        htmlFor={htmlFor}
      >
        {label}
      </FieldLabel>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export type FormMessageProps = {
  tone?: "danger" | "success";
  children: ReactNode;
  className?: string;
};

export function FormMessage({
  tone = "danger",
  children,
  className,
}: FormMessageProps) {
  return (
    <p
      aria-live="polite"
      className={twMerge(
        "text-sm",
        tone === "success" ? "text-emerald-300" : "text-red-400",
        className,
      )}
    >
      {children}
    </p>
  );
}
