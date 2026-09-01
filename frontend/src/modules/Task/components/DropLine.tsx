import { twMerge } from "tailwind-merge";

export default function DropLine({
  className,
  atEnd = false,
  atStart = false,
}: {
  className?: string;
  atEnd?: boolean;
  atStart?: boolean;
}) {
  return (
    <div
      aria-hidden
      data-dnd-placeholder=""
      className={twMerge(
        "pointer-events-none absolute inset-x-0 z-10 h-[3px] rounded-full bg-zinc-100",
        atEnd ? "top-full mt-0.5" : atStart ? "top-0" : "bottom-full mb-0.5",
        className,
      )}
    />
  );
}
