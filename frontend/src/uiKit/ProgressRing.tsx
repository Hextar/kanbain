export type ProgressRingProps = {
  completed: number;
  total: number;
  className?: string;
};

export default function ProgressRing({
  completed,
  total,
  className = "size-4 shrink-0 -rotate-90",
}: ProgressRingProps) {
  const radius = 6.5;
  const circumference = 2 * Math.PI * radius;
  const ratio = total === 0 ? 0 : Math.min(completed / total, 1);

  return (
    <svg aria-hidden className={className} viewBox="0 0 16 16">
      <circle
        cx="8"
        cy="8"
        fill="none"
        r={radius}
        className="stroke-zinc-700"
        strokeWidth="2.25"
      />
      <circle
        cx="8"
        cy="8"
        fill="none"
        r={radius}
        className="stroke-emerald-400"
        strokeDasharray={`${circumference * ratio} ${circumference}`}
        strokeLinecap="round"
        strokeWidth="2.25"
      />
    </svg>
  );
}
