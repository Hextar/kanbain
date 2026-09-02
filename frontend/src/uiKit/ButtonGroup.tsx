"use client";

import type { ComponentProps, KeyboardEvent } from "react";
import { twMerge } from "tailwind-merge";
import {
  BUTTON_GROUP_SHELL,
  buttonGroupItemClassName,
  type ButtonGroupItemTone,
  type ButtonGroupSize,
} from "./buttonGroupStyles";

export type { ButtonGroupItemTone, ButtonGroupSize };
export { buttonGroupItemClassName };

function onTabListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  const current = (event.target as HTMLElement).closest<HTMLElement>(
    '[role="tab"]',
  );
  if (!current) return;
  const tabs = [
    ...event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
  ];
  const index = tabs.indexOf(current);
  if (index < 0 || tabs.length === 0) return;
  event.preventDefault();
  const delta = event.key === "ArrowRight" ? 1 : -1;
  const next = tabs[(index + delta + tabs.length) % tabs.length];
  next?.focus();
}

export type ButtonGroupProps = ComponentProps<"div"> & {
  size?: ButtonGroupSize;
};

export default function ButtonGroup({
  children,
  size = "xs",
  className,
  role = "group",
  onKeyDown,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      {...props}
      className={twMerge(BUTTON_GROUP_SHELL[size], className)}
      role={role}
      onKeyDown={(event) => {
        if (role === "tablist") onTabListKeyDown(event);
        onKeyDown?.(event);
      }}
    >
      {children}
    </div>
  );
}

export type ButtonGroupItemProps = ComponentProps<"button"> & {
  selected?: boolean;
  size?: ButtonGroupSize;
  tone?: ButtonGroupItemTone;
  grow?: boolean;
  selectedClassName?: string;
};

export function ButtonGroupItem({
  selected = false,
  size = "sm",
  tone = "muted",
  grow = true,
  selectedClassName,
  className,
  type = "button",
  ...props
}: ButtonGroupItemProps) {
  return (
    <button
      {...props}
      aria-pressed={selected}
      className={buttonGroupItemClassName({
        selected,
        size,
        tone,
        grow,
        selectedClassName,
        className,
      })}
      type={type}
    />
  );
}
