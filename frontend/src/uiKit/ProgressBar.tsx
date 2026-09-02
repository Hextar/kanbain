import { twMerge } from "tailwind-merge";

export type ProgressBarProps = {
  percent: number;
  label: string;
  variant?: "bar" | "flush";
  barClassName?: string;
  trackClassName?: string;
  className?: string;
};

export default function ProgressBar({
  percent,
  label,
  variant = "bar",
  barClassName = "bg-gradient-to-r from-violet-400 to-purple-600",
  trackClassName,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  if (variant === "flush") {
    return (
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={clamped}
        className={twMerge(
          "absolute inset-x-0 top-0 h-1 overflow-hidden",
          className,
        )}
        role="progressbar"
      >
        <div
          aria-hidden
          className={twMerge("absolute inset-0", trackClassName)}
        />
        <div
          className={twMerge(
            "relative h-full motion-safe:transition-[width] motion-safe:duration-700",
            barClassName,
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
      className={twMerge(
        "h-1 overflow-hidden rounded-full bg-white/8",
        trackClassName,
        className,
      )}
      role="progressbar"
    >
      <div
        className={twMerge(
          "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700",
          barClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
