"use client";

import { HeaderSlot } from "@uiKit/AppHeader";
import ProgressRing from "@uiKit/ProgressRing";
import { useAssignees, useMilestones, useTags } from "../hooks/useCatalog";
import type { FilterClause } from "../helpers/boardFilter";
import type { BoardView } from "../helpers/boardView";
import type { Column } from "../types/Column";
import BoardFilter from "./BoardFilter";
import MilestoneMenu from "./MilestoneMenu";
import ViewTabs from "./ViewTabs";

type HeaderProps = {
  projectId: string;
  columns: Column[];
  clauses: FilterClause[];
  completedCount: number;
  totalCount: number;
  view: BoardView;
  hrefForView: (view: BoardView) => string;
  onClausesChange: (clauses: FilterClause[]) => void;
};

export default function Header({
  projectId,
  columns,
  clauses,
  completedCount,
  totalCount,
  view,
  hrefForView,
  onClausesChange,
}: HeaderProps) {
  const { data: assignees = [] } = useAssignees();
  const { data: tags = [] } = useTags();
  const { data: milestones = [] } = useMilestones(projectId);

  return (
    <HeaderSlot center={<ViewTabs hrefFor={hrefForView} view={view} />}>
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
    </HeaderSlot>
  );
}
