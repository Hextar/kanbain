"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import NewProjectForm from "./components/NewProjectForm";
import ProjectCard from "./components/ProjectCard";
import ProjectEmptyState from "./components/ProjectEmptyState";
import { retryProjectPlanAction } from "./actions/retryPlan";
import { projectKeys } from "./api/projectKeys";
import { reviveProject } from "./helpers/projectJson";
import { useProjects } from "./hooks/useProjects";
import type { Project } from "./types/Project";

type ProjectHomeProps = {
  initialProjects: Project[];
};

export default function ProjectHome({ initialProjects }: ProjectHomeProps) {
  const queryClient = useQueryClient();
  const [initial] = useState(() => initialProjects.map(reviveProject));
  const { data: projects = [] } = useProjects(initial);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const hasProjects = projects.length > 0;

  function remember(project: Project) {
    const next = reviveProject(project);
    queryClient.setQueryData<Project[]>(projectKeys.list(), (current) => {
      const list = current ?? [];
      if (list.some((item) => item.id === next.id)) {
        return list.map((item) => (item.id === next.id ? next : item));
      }
      return [next, ...list];
    });
    queryClient.setQueryData(projectKeys.detail(next.id), next);
  }

  async function handleRetry(projectId: string) {
    setRetryingId(projectId);
    try {
      remember(await retryProjectPlanAction(projectId));
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col">
      <header className="flex items-center justify-between gap-4 p-6">
        <h1 className="text-3xl font-bold text-white">KanbAIn</h1>
        {hasProjects ? <NewProjectForm onCreated={remember} /> : null}
      </header>
      {hasProjects ? (
        <ul className="grid grid-cols-1 gap-4 overflow-y-auto px-6 pb-8 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id} className="min-w-0">
              <ProjectCard
                isRetrying={retryingId === project.id}
                project={project}
                onRetry={handleRetry}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ProjectEmptyState onCreated={remember} />
      )}
    </div>
  );
}
