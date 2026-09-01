export const COLUMN_COLOR_IDS = [
  "sky",
  "amber",
  "orange",
  "fuchsia",
  "violet",
  "teal",
  "emerald",
  "rose",
  "cyan",
  "indigo",
] as const;

export type ColumnColorId = (typeof COLUMN_COLOR_IDS)[number];

export type ColumnAccent = {
  id: ColumnColorId;
  label: string;
  bar: string;
  badge: string;
  dot: string;
  glow: string;
};

export const COLUMN_COLOR_OPTIONS: ColumnAccent[] = [
  {
    id: "sky",
    label: "Sky",
    bar: "bg-sky-400",
    badge: "bg-sky-500/15 text-sky-200",
    dot: "bg-sky-400",
    glow: "from-sky-400/30",
  },
  {
    id: "amber",
    label: "Amber",
    bar: "bg-amber-400",
    badge: "bg-amber-500/15 text-amber-200",
    dot: "bg-amber-400",
    glow: "from-amber-400/30",
  },
  {
    id: "orange",
    label: "Orange",
    bar: "bg-orange-500",
    badge: "bg-orange-500/15 text-orange-200",
    dot: "bg-orange-400",
    glow: "from-orange-500/30",
  },
  {
    id: "fuchsia",
    label: "Fuchsia",
    bar: "bg-fuchsia-400",
    badge: "bg-fuchsia-500/15 text-fuchsia-200",
    dot: "bg-fuchsia-400",
    glow: "from-fuchsia-400/30",
  },
  {
    id: "violet",
    label: "Violet",
    bar: "bg-violet-400",
    badge: "bg-violet-500/15 text-violet-200",
    dot: "bg-violet-400",
    glow: "from-violet-400/30",
  },
  {
    id: "teal",
    label: "Teal",
    bar: "bg-teal-400",
    badge: "bg-teal-500/15 text-teal-200",
    dot: "bg-teal-400",
    glow: "from-teal-400/30",
  },
  {
    id: "emerald",
    label: "Emerald",
    bar: "bg-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-200",
    dot: "bg-emerald-400",
    glow: "from-emerald-400/30",
  },
  {
    id: "rose",
    label: "Rose",
    bar: "bg-rose-400",
    badge: "bg-rose-500/15 text-rose-200",
    dot: "bg-rose-400",
    glow: "from-rose-400/30",
  },
  {
    id: "cyan",
    label: "Cyan",
    bar: "bg-cyan-400",
    badge: "bg-cyan-500/15 text-cyan-200",
    dot: "bg-cyan-400",
    glow: "from-cyan-400/30",
  },
  {
    id: "indigo",
    label: "Indigo",
    bar: "bg-indigo-400",
    badge: "bg-indigo-500/15 text-indigo-200",
    dot: "bg-indigo-400",
    glow: "from-indigo-400/30",
  },
];

const ACCENT_BY_ID = new Map(
  COLUMN_COLOR_OPTIONS.map((accent) => [accent.id, accent]),
);

export function isColumnColorId(value: unknown): value is ColumnColorId {
  return typeof value === "string" && ACCENT_BY_ID.has(value as ColumnColorId);
}

export function defaultColumnColor(order: number): ColumnColorId {
  return COLUMN_COLOR_IDS[order % COLUMN_COLOR_IDS.length];
}

export function columnAccent(
  color: string | undefined,
  fallbackIndex: number,
  isDone = false,
): ColumnAccent {
  const stored = color ? ACCENT_BY_ID.get(color as ColumnColorId) : undefined;
  if (stored) return stored;
  if (isDone) return ACCENT_BY_ID.get("emerald")!;
  return ACCENT_BY_ID.get(defaultColumnColor(fallbackIndex))!;
}

export const COLUMN_COLOR_FILL: Record<ColumnColorId, string> = {
  sky: "#38bdf8",
  amber: "#fbbf24",
  orange: "#f97316",
  fuchsia: "#e879f9",
  violet: "#a78bfa",
  teal: "#2dd4bf",
  emerald: "#34d399",
  rose: "#fb7185",
  cyan: "#22d3ee",
  indigo: "#818cf8",
};

export function columnAccentFill(
  color: string | undefined,
  fallbackIndex: number,
  isDone = false,
): string {
  return COLUMN_COLOR_FILL[columnAccent(color, fallbackIndex, isDone).id];
}

export function columnDialogAccent(
  color: string | undefined,
  fallbackIndex = 0,
  isDone = false,
): { bar: string; glow: string } {
  const accent = columnAccent(color, fallbackIndex, isDone);
  return { bar: accent.bar, glow: accent.glow };
}
