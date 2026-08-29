"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Button from "@uiKit/Button";
import KanbanBoard from "@modules/Task/KanbanBoard";
import { retryProjectPlanAction } from "@modules/Project/actions/retryPlan";
import { projectKeys } from "@modules/Project/api/projectKeys";
import {
  fetchProjectBoard,
  seedProjectBoard,
  type ProjectBoard,
} from "@modules/Project/helpers/projectBoard";
import { reviveProject } from "@modules/Project/helpers/projectJson";
import { useProject } from "@modules/Project/hooks/useProjects";
import type { Project } from "@modules/Project/types/Project";
import type { Column } from "@modules/Task/types/Column";
import type { Task } from "@modules/Task/types/Task";

const PLAN_RANK: Record<Project["planStatus"], number> = {
  planning: 0,
  failed: 1,
  ready: 2,
};

type ProjectWorkspaceProps = {
  project: Project;
  initialColumns: Column[];
  initialTasks?: Task[];
};

export default function ProjectWorkspace({
  project,
  initialColumns,
  initialTasks,
}: ProjectWorkspaceProps) {
  const queryClient = useQueryClient();
  const [initial] = useState(() => {
    const revived = reviveProject(project);
    const cached = queryClient.getQueryData<Project>(
      projectKeys.detail(revived.id),
    );
    const next =
      cached && PLAN_RANK[cached.planStatus] > PLAN_RANK[revived.planStatus]
        ? cached
        : revived;
    queryClient.setQueryData(projectKeys.detail(revived.id), next);
    if (next.planStatus === "ready" && initialTasks) {
      seedProjectBoard(queryClient, revived.id, {
        columns: initialColumns,
        tasks: initialTasks,
      });
    }
    return next;
  });
  const { data } = useProject(initial);
  const [isRetrying, setIsRetrying] = useState(false);
  const current = data ?? initial;
  const ssrBoard =
    project.planStatus === "ready" && initialTasks
      ? { columns: initialColumns, tasks: initialTasks }
      : undefined;

  const boardQuery = useQuery({
    queryKey: projectKeys.board(current.id),
    queryFn: async () => {
      const board = await fetchProjectBoard(current.id);
      seedProjectBoard(queryClient, current.id, board);
      return board;
    },
    enabled: current.planStatus === "ready",
    initialData: ssrBoard,
  });

  async function handleRetry() {
    setIsRetrying(true);
    try {
      const next = reviveProject(await retryProjectPlanAction(current.id));
      queryClient.setQueryData(projectKeys.detail(current.id), next);
      queryClient.setQueryData<Project[]>(projectKeys.list(), (list) =>
        list?.map((item) => (item.id === next.id ? next : item)),
      );
      queryClient.removeQueries({ queryKey: projectKeys.board(current.id) });
    } finally {
      setIsRetrying(false);
    }
  }

  if (current.planStatus === "failed") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">{current.name}</h1>
        <p className="max-w-md text-red-400">
          {current.planError ?? "Planning failed."}
        </p>
        <Button disabled={isRetrying} type="button" onClick={handleRetry}>
          {isRetrying ? "Retrying…" : "Retry planning"}
        </Button>
        <Link className="text-purple-400 hover:text-purple-300" href="/">
          Back to projects
        </Link>
      </div>
    );
  }

  const board: ProjectBoard | undefined = boardQuery.data;
  if (current.planStatus !== "ready" || !board) {
    return (
      <PlanningState
        name={current.name}
        opening={current.planStatus === "ready"}
      />
    );
  }

  return (
    <KanbanBoard
      initialColumns={board.columns}
      initialTasks={board.tasks}
      project={current}
    />
  );
}

function PlanningState({ name, opening }: { name: string; opening: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="plan-shimmer flex size-16 items-center justify-center rounded-2xl border border-purple-500/40 bg-zinc-800 text-purple-300">
        <Sparkles aria-hidden size={28} />
      </div>
      <h1 className="text-2xl font-semibold text-white">{name}</h1>
      <p className="max-w-md text-zinc-400">
        {opening
          ? "The plan is ready. Loading the board…"
          : "The planner is filling the board. You can go back to the project list and keep working."}
      </p>
      <Link className="text-purple-400 hover:text-purple-300" href="/">
        Back to projects
      </Link>
    </div>
  );
}
