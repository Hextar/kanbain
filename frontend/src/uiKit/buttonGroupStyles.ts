import { twMerge } from "tailwind-merge";

export type ButtonGroupSize = "xs" | "sm";
export type ButtonGroupItemTone = "muted" | "primary";

export const BUTTON_GROUP_SHELL: Record<ButtonGroupSize, string> = {
  xs: "flex h-7 items-center rounded-md bg-[#181b24] p-0.5 ring-1 ring-white/8",
  sm: "flex h-8 min-w-0 items-center rounded-md bg-[#12141c] p-0.5 ring-1 ring-white/8",
};

const ITEM_BASE: Record<ButtonGroupSize, string> = {
  xs: "inline-flex h-6 touch-manipulation items-center justify-center gap-1.5 rounded px-2 text-xs font-medium tracking-wide focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
  sm: "h-full min-w-0 cursor-pointer rounded px-1 text-[10px] font-medium tracking-wide focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
};

const SELECTED_TONE: Record<ButtonGroupItemTone, string> = {
  muted: "bg-zinc-700/90 text-white",
  primary:
    "bg-gradient-to-br from-violet-400 to-purple-600 text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.22)]",
};

export function buttonGroupItemClassName({
  selected = false,
  size = "xs",
  tone = "muted",
  grow = false,
  selectedClassName,
  className,
}: {
  selected?: boolean;
  size?: ButtonGroupSize;
  tone?: ButtonGroupItemTone;
  grow?: boolean;
  selectedClassName?: string;
  className?: string;
} = {}) {
  return twMerge(
    ITEM_BASE[size],
    grow && "flex-1",
    selected
      ? (selectedClassName ?? SELECTED_TONE[tone])
      : "text-zinc-500 hover:text-zinc-300",
    className,
  );
}
