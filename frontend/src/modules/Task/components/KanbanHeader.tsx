"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SettingsButton } from "@modules/Settings/components/SettingsProvider";
import { useAssignees, useMilestones, useTags } from "../hooks/useCatalog";
import type { FilterClause } from "../helpers/boardFilter";
import type { Column } from "../types/Column";
import BoardFilter from "./BoardFilter";
import MilestoneMenu from "./MilestoneMenu";

type HeaderProps = {
  className?: string;
  projectId: string;
  projectName: string;
  columns: Column[];
  clauses: FilterClause[];
  completedCount: number;
  totalCount: number;
  onClausesChange: (clauses: FilterClause[]) => void;
};

export default function Header({
  className,
  projectId,
  projectName,
  columns,
  clauses,
  completedCount,
  totalCount,
  onClausesChange,
}: HeaderProps) {
  const { data: assignees = [] } = useAssignees();
  const { data: tags = [] } = useTags();
  const { data: milestones = [] } = useMilestones(projectId);

  return (
    <div
      className={`relative z-10 flex h-12 shrink-0 items-center gap-3 border-b border-white/5 bg-[#12141c] px-4 ${className}`}
    >
      <div className="flex max-w-[45%] min-w-0 shrink-0 items-center gap-2">
        <Link
          className="inline-flex shrink-0 items-center gap-1 text-sm text-zinc-500 hover:text-white"
          href="/"
        >
          Projects
        </Link>
        <ChevronRight size={14} className="shrink-0 text-zinc-600" />
        <h1 className="truncate rounded-full bg-zinc-800/80 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/8">
          {projectName}
        </h1>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <BoardFilter
          catalog={{ assignees, milestones, tags, columns }}
          clauses={clauses}
          onChange={onClausesChange}
        />
        {totalCount > 0 ? (
          <span
            aria-label={`${completedCount} of ${totalCount} completed`}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs text-zinc-400"
          >
            <ProgressRing completed={completedCount} total={totalCount} />
            <span className="hidden tabular-nums sm:inline">
              {completedCount}/{totalCount} completed
            </span>
          </span>
        ) : null}
        <MilestoneMenu projectId={projectId} />
        <SettingsButton size="xs" />
      </div>
    </div>
  );
}

function ProgressRing({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const radius = 6.5;
  const circumference = 2 * Math.PI * radius;
  const ratio = total === 0 ? 0 : Math.min(completed / total, 1);

  return (
    <svg aria-hidden className="size-4 shrink-0 -rotate-90" viewBox="0 0 16 16">
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
