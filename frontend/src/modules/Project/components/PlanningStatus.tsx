"use client";

type PlanningStatusProps = {
  message: string;
  progress: number;
};

export default function PlanningStatus({
  message,
  progress,
}: PlanningStatusProps) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p aria-live="polite" className="min-w-0 text-sm leading-5 text-purple-200/90">
        {message}
      </p>
      <div
        aria-label="Planning progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="h-1 overflow-hidden rounded-full bg-white/8"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-600 motion-safe:transition-[width] motion-safe:duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
