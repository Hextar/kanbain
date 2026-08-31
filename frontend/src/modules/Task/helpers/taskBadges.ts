import type { TaskPriority, WorkKind } from "../types/Catalog";

export const PILL_CLASS_NAME =
  "rounded-full px-1.5 py-px text-[10px] font-medium tracking-wide";

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-sky-500/15 text-sky-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-rose-500/15 text-rose-300",
};

export const WORK_KIND_STYLES: Record<WorkKind, string> = {
  epic: "bg-violet-500/15 text-violet-300",
  story: "bg-blue-500/15 text-blue-300",
  task: "bg-zinc-700/80 text-zinc-300",
};

export const ESTIMATE_STYLE = "bg-zinc-800 text-zinc-300 uppercase";

export const PRIORITY_ACCENT: Record<
  TaskPriority | "none",
  { bar: string; glow: string }
> = {
  none: { bar: "bg-violet-400/80", glow: "from-violet-400/25" },
  low: { bar: "bg-sky-400", glow: "from-sky-400/30" },
  medium: { bar: "bg-amber-400", glow: "from-amber-400/30" },
  high: { bar: "bg-rose-400", glow: "from-rose-400/30" },
};

export function labeledPriority(priority: string) {
  return `Priority: ${priority.charAt(0).toUpperCase()}${priority.slice(1)}`;
}
