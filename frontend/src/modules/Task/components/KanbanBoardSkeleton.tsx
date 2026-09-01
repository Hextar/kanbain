import Link from "next/link";
import { ChevronRight, GripVertical } from "lucide-react";
import { SettingsButton } from "@modules/Settings/components/SettingsProvider";
import { COLUMN_COLOR_OPTIONS } from "@modules/Task/helpers/columnAccent";
import Skeleton from "@uiKit/Skeleton";
import PlanningStatus from "@modules/Project/components/PlanningStatus";

const COLUMNS = [
  { cards: 3, titleWidth: "w-12", widths: ["w-3/4", "w-1/2", "w-2/3"] },
  { cards: 2, titleWidth: "w-20", widths: ["w-5/6", "w-2/3"] },
  {
    cards: 4,
    titleWidth: "w-10",
    widths: ["w-3/5", "w-4/5", "w-1/2", "w-3/4"],
  },
  { cards: 2, titleWidth: "w-14", widths: ["w-2/3", "w-1/2"] },
] as const;

type KanbanBoardSkeletonProps = {
  projectName?: string;
  label?: string;
  statusText?: string;
  progress?: number;
};

export default function KanbanBoardSkeleton({
  projectName,
  label = "Loading board…",
  statusText,
  progress,
}: KanbanBoardSkeletonProps) {
  const showProgress = statusText !== undefined && progress !== undefined;
  return (
    <div
      aria-busy
      className="canvas-dots flex h-dvh w-full max-w-full min-w-0 flex-col overflow-x-clip"
      role="status"
    >
      <span className="sr-only">{label}</span>
      <header className="relative z-40 grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-white/5 bg-[#12141c] px-4">
        <nav className="flex min-w-0 items-center gap-2">
          <Link
            className="inline-flex shrink-0 items-center gap-1 text-sm text-zinc-500 hover:text-white"
            href="/"
          >
            Projects
          </Link>
          <ChevronRight
            aria-hidden
            className="shrink-0 text-zinc-600"
            size={14}
          />
          {projectName ? (
            <span className="truncate rounded-full bg-zinc-800/80 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/8">
              {projectName}
            </span>
          ) : (
            <Skeleton className="h-7 w-36 rounded-full" />
          )}
        </nav>
        <ViewTabsSkeleton />
        <div className="flex min-w-0 items-center justify-end gap-2">
          {statusText ? (
            <span className="hidden truncate text-xs text-zinc-500 sm:inline">
              {showProgress ? "Planning" : statusText}
            </span>
          ) : (
            <>
              <Skeleton className="h-7 w-[4.25rem] rounded-md" />
              <Skeleton className="hidden size-4 rounded-full sm:block" />
              <Skeleton className="hidden h-3 w-24 sm:block" />
            </>
          )}
          <Skeleton className="size-7 rounded-md" />
          <SettingsButton size="xs" />
        </div>
      </header>
      <div className="relative min-h-0 min-w-0 flex-1">
        {showProgress ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-white/8 bg-[#12141c]/92 p-4 shadow-lg shadow-black/40 backdrop-blur-sm">
              <PlanningStatus message={statusText ?? ""} progress={progress} />
            </div>
          </div>
        ) : null}
        <div className="board-x-scroll relative z-0 flex h-full min-h-0 w-full min-w-0 flex-1 flex-row items-stretch justify-start gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 py-3">
        {COLUMNS.map((column, index) => {
          const accent = COLUMN_COLOR_OPTIONS[index];
          return (
            <ColumnSkeleton
              key={accent.id}
              accentBar={accent.bar}
              accentDot={accent.dot}
              accentGlow={accent.glow}
              cardCount={column.cards}
              titleWidth={column.titleWidth}
              titleWidths={column.widths}
            />
          );
        })}
        <div className="flex h-[52px] w-[280px] shrink-0 flex-col self-start overflow-hidden rounded-xl border border-dashed border-white/12" />
        </div>
      </div>
    </div>
  );
}

function ViewTabsSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-7 items-center rounded-md bg-[#181b24] p-0.5 ring-1 ring-white/8"
    >
      <span className="inline-flex h-6 items-center rounded bg-zinc-700/90 px-2 text-xs font-medium text-white">
        Board
      </span>
      <span className="inline-flex h-6 items-center rounded px-2 text-xs font-medium text-zinc-500">
        Flow
      </span>
    </div>
  );
}

function ColumnSkeleton({
  accentBar,
  accentDot,
  accentGlow,
  cardCount,
  titleWidth,
  titleWidths,
}: {
  accentBar: string;
  accentDot: string;
  accentGlow: string;
  cardCount: number;
  titleWidth: string;
  titleWidths: readonly string[];
}) {
  return (
    <section className="relative isolate flex h-full min-h-0 w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-white/6 bg-[#181b24]">
      <div className={`h-[3px] w-full shrink-0 ${accentBar}`} />
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-16 -right-8 size-44 rounded-full bg-gradient-to-br to-transparent opacity-40 blur-2xl ${accentGlow}`}
      />
      <header className="relative z-20 flex h-10 w-full flex-row items-center gap-1 px-2">
        <span className="flex h-7 w-4 shrink-0 items-center justify-center">
          <GripVertical aria-hidden className="block text-zinc-600" size={14} />
        </span>
        <span className={`size-2 shrink-0 rounded-full ${accentDot}`} />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Skeleton className={`h-3 ${titleWidth}`} />
          <Skeleton className="h-5 min-w-5 rounded-full" />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-2.5 pb-3">
        {titleWidths.slice(0, cardCount).map((width, index) => (
          <CardSkeleton key={index} accentBar={accentBar} titleWidth={width} />
        ))}
      </div>
    </section>
  );
}

function CardSkeleton({
  accentBar,
  titleWidth,
}: {
  accentBar: string;
  titleWidth: string;
}) {
  return (
    <article className="relative min-w-0 rounded-lg border border-white/8 bg-[#14161e] p-3 shadow-sm shadow-black/25">
      <div
        className={`absolute top-0 bottom-0 left-0 w-[3px] rounded-l-lg ${accentBar}`}
      />
      <div className="flex flex-col gap-1.5 pl-1">
        <Skeleton className="h-3 w-10" />
        <Skeleton className={`h-4 ${titleWidth}`} />
        <div className="flex items-center gap-1">
          <Skeleton className="h-4 w-10 rounded-full" />
          <Skeleton className="h-4 w-8 rounded-full" />
        </div>
      </div>
    </article>
  );
}
