import { twMerge } from "tailwind-merge";

export default function DropLine({
  atEnd = false,
  atStart = false,
}: {
  atEnd?: boolean;
  atStart?: boolean;
}) {
  return (
    <div
      aria-hidden
      data-dnd-placeholder=""
      className={twMerge(
        "pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-zinc-400",
        atEnd ? "top-full mt-0.5" : atStart ? "top-1" : "bottom-full mb-0.5",
      )}
    />
  );
}
