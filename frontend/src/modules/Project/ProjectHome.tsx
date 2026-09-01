"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Columns3 } from "lucide-react";
import ConfirmDialog from "@uiKit/ConfirmDialog";
import { markSpawn, shatterByAttr } from "@libraries/particles";
import NewProjectForm from "./components/NewProjectForm";
import ProjectCard from "./components/ProjectCard";
import ProjectEmptyState from "./components/ProjectEmptyState";
import { deleteProjectAction } from "./actions/deleteProject";
import { retryProjectPlanAction } from "./actions/retryPlan";
import { projectKeys } from "./api/projectKeys";
import { reviveProject } from "./helpers/projectJson";
import { useProjects } from "./hooks/useProjects";
import { SettingsButton } from "@modules/Settings/components/SettingsProvider";
import { useRequirePlannerKey } from "@modules/Settings/hooks/useRequirePlannerKey";
import type { Project } from "./types/Project";

type ProjectHomeProps = {
  initialProjects: Project[];
};

export default function ProjectHome({ initialProjects }: ProjectHomeProps) {
  const queryClient = useQueryClient();
  const [initial] = useState(() => initialProjects.map(reviveProject));
  const { data: projects = [], warmingIds } = useProjects(initial);
  const requirePlannerKey = useRequirePlannerKey();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const hasProjects = projects.length > 0;
  const projectCountLabel =
    projects.length === 1 ? "1 project" : `${projects.length} projects`;

  function remember(project: Project) {
    const next = reviveProject(project);
    const list = queryClient.getQueryData<Project[]>(projectKeys.list()) ?? [];
    if (!list.some((item) => item.id === next.id)) markSpawn(next.id);
    queryClient.setQueryData<Project[]>(projectKeys.list(), (current) => {
      const items = current ?? [];
      if (items.some((item) => item.id === next.id)) {
        return items.map((item) => (item.id === next.id ? next : item));
      }
      return [next, ...items];
    });
    queryClient.setQueryData(projectKeys.detail(next.id), next);
  }

  async function handleRetry(projectId: string) {
    if (!(await requirePlannerKey())) return;
    setRetryingId(projectId);
    try {
      remember(await retryProjectPlanAction(projectId));
    } finally {
      setRetryingId(null);
    }
  }

  async function handleDelete(projectId: string) {
    const previous = queryClient.getQueryData<Project[]>(projectKeys.list());
    queryClient.setQueryData<Project[]>(projectKeys.list(), (current) =>
      (current ?? []).filter((item) => item.id !== projectId),
    );
    setDeletingId(projectId);
    try {
      await deleteProjectAction(projectId);
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.removeQueries({ queryKey: projectKeys.board(projectId) });
    } catch {
      if (previous) queryClient.setQueryData(projectKeys.list(), previous);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/5 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-purple-500/15 text-purple-300">
            <Columns3 aria-hidden size={16} />
          </div>
          <h1 className="text-sm font-semibold text-white">KanbAIn</h1>
          <p className="truncate text-xs text-zinc-500">
            {hasProjects ? projectCountLabel : "Your projects"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasProjects ? <NewProjectForm onCreated={remember} /> : null}
          <SettingsButton size="xs" />
        </div>
      </header>
      <div className="canvas-dots flex min-h-dvh w-full flex-col">
        {hasProjects ? (
          <ul className="grid grid-cols-1 gap-4 overflow-y-auto px-6 py-6 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id} className="h-full min-w-0">
                <ProjectCard
                  isDeleting={deletingId === project.id}
                  isOpening={warmingIds.has(project.id)}
                  isRetrying={retryingId === project.id}
                  project={project}
                  onDelete={() => setProjectToDelete(project)}
                  onRetry={handleRetry}
                />
              </li>
            ))}
          </ul>
        ) : (
          <ProjectEmptyState onCreated={remember} />
        )}
      </div>
      <ConfirmDialog
        open={projectToDelete !== null}
        title={`Delete “${projectToDelete?.name ?? "this project"}”?`}
        description="This will permanently delete this project and all of its boards, tasks, and milestones. This cannot be undone."
        confirmLabel="Delete project"
        variant="danger"
        onCancel={() => setProjectToDelete(null)}
        onConfirm={() => {
          const project = projectToDelete;
          if (!project) return;
          setProjectToDelete(null);
          shatterByAttr("data-project-id", project.id);
          void handleDelete(project.id);
        }}
      />
    </div>
  );
}
