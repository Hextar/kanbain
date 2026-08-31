import { twMerge } from "tailwind-merge";

export default function DropLine({ atEnd = false }: { atEnd?: boolean }) {
  return (
    <div
      aria-hidden
      data-dnd-placeholder=""
      className={twMerge(
        "pointer-events-none absolute right-0 left-0 z-10 h-0.5 rounded-full bg-zinc-400",
        atEnd ? "top-full" : "top-0 -translate-y-1/2",
      )}
    />
  );
}
