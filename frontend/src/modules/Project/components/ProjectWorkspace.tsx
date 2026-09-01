"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Button from "@uiKit/Button";
import KanbanBoard from "@modules/Task/KanbanBoard";
import KanbanBoardSkeleton from "@modules/Task/components/KanbanBoardSkeleton";
import { retryProjectPlanAction } from "@modules/Project/actions/retryPlan";
import { useRequirePlannerKey } from "@modules/Settings/hooks/useRequirePlannerKey";
import { projectKeys } from "@modules/Project/api/projectKeys";
import {
  fetchProjectBoard,
  seedProjectBoard,
  type ProjectBoard,
} from "@modules/Project/helpers/projectBoard";
import { reviveProject } from "@modules/Project/helpers/projectJson";
import { usePlanLive } from "@modules/Project/hooks/usePlanLive";
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
  const requirePlannerKey = useRequirePlannerKey();
  const [isRetrying, setIsRetrying] = useState(false);
  const current = data ?? initial;
  const live = usePlanLive(current, current.planStatus === "planning");
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
    if (!(await requirePlannerKey())) return;
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
    const opening = current.planStatus === "ready";
    return (
      <KanbanBoardSkeleton
        label={opening ? "Loading board…" : live.message}
        projectName={current.name}
        progress={opening ? undefined : live.progress}
        statusText={opening ? undefined : live.message}
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
