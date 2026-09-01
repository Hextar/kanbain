"use client";

import type { KeyboardEvent } from "react";
import Link from "next/link";
import { ChartColumn, Columns3 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import type { BoardView } from "../helpers/boardView";

const VIEWS = [
  { id: "board" as const, label: "Board", icon: Columns3 },
  { id: "flow" as const, label: "Flow", icon: ChartColumn },
];

type ViewTabsProps = {
  view: BoardView;
  hrefFor: (view: BoardView) => string;
  className?: string;
};

export default function ViewTabs({ view, hrefFor, className }: ViewTabsProps) {
  return (
    <div
      aria-label="Board view"
      className={twMerge(
        "flex h-7 items-center rounded-md bg-[#181b24] p-0.5 ring-1 ring-white/8",
        className,
      )}
      role="tablist"
      onKeyDown={onTabListKeyDown}
    >
      {VIEWS.map((item) => {
        const selected = item.id === view;
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            aria-controls={`view-panel-${item.id}`}
            aria-label={item.label}
            aria-selected={selected}
            className={twMerge(
              "inline-flex h-6 touch-manipulation items-center justify-center gap-1.5 rounded px-2 text-xs font-medium tracking-wide focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
              selected
                ? "bg-zinc-700/90 text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
            href={hrefFor(item.id)}
            id={`view-tab-${item.id}`}
            role="tab"
            scroll={false}
            tabIndex={selected ? 0 : -1}
          >
            <Icon aria-hidden className="sm:hidden" size={14} />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

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
