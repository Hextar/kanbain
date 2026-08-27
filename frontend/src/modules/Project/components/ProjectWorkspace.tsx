"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Button from "@uiKit/Button";
import KanbanBoard from "@modules/Task/KanbanBoard";
import { retryProjectPlanAction } from "@modules/Project/actions/retryPlan";
import { projectKeys } from "@modules/Project/api/projectKeys";
import { reviveProject } from "@modules/Project/helpers/projectJson";
import { useProject } from "@modules/Project/hooks/useProjects";
import type { Project } from "@modules/Project/types/Project";
import type { Column } from "@modules/Task/types/Column";

type ProjectWorkspaceProps = {
  project: Project;
  initialColumns: Column[];
};

export default function ProjectWorkspace({
  project,
  initialColumns,
}: ProjectWorkspaceProps) {
  const queryClient = useQueryClient();
  const [initial] = useState(() => reviveProject(project));
  const { data } = useProject(initial);
  const [isRetrying, setIsRetrying] = useState(false);
  const current = data ?? initial;

  async function handleRetry() {
    setIsRetrying(true);
    try {
      const next = reviveProject(await retryProjectPlanAction(current.id));
      queryClient.setQueryData(projectKeys.detail(current.id), next);
      queryClient.setQueryData<Project[]>(projectKeys.list(), (list) =>
        list?.map((item) => (item.id === next.id ? next : item)),
      );
    } finally {
      setIsRetrying(false);
    }
  }

  if (current.planStatus === "planning") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="plan-shimmer flex size-16 items-center justify-center rounded-2xl border border-purple-500/40 bg-zinc-800 text-purple-300">
          <Sparkles aria-hidden size={28} />
        </div>
        <h1 className="text-2xl font-semibold text-white">{current.name}</h1>
        <p className="max-w-md text-zinc-400">
          The planner is filling the board. You can go back to the project list
          and keep working.
        </p>
        <Link className="text-purple-400 hover:text-purple-300" href="/">
          Back to projects
        </Link>
      </div>
    );
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

  return <KanbanBoard initialColumns={initialColumns} project={current} />;
}
