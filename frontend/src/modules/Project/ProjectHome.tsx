"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { HeaderSlot } from "@uiKit/AppHeader";
import CanvasDots from "@uiKit/CanvasDots";
import ConfirmDialog from "@uiKit/ConfirmDialog";
import { showToast } from "@libraries/toast";
import { markSpawn, shatterByAttr } from "@libraries/particles";
import NewProjectForm from "./components/NewProjectForm";
import ProjectCard from "./components/ProjectCard";
import ProjectEmptyState from "./components/ProjectEmptyState";
import { deleteProjectAction } from "./actions/deleteProject";
import { retryProjectPlanAction } from "./actions/retryPlan";
import { projectKeys } from "./api/projectKeys";
import { reviveProject } from "./helpers/projectJson";
import { useProjects } from "./hooks/useProjects";
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
    } catch {
      showToast("Couldn't retry planning.");
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
      showToast("Couldn't delete the project.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <HeaderSlot>
        {hasProjects ? <NewProjectForm onCreated={remember} /> : null}
      </HeaderSlot>
      <CanvasDots className="flex min-h-0 w-full flex-1 flex-col">
        {hasProjects ? (
          <ul className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 py-6 sm:grid-cols-2 xl:grid-cols-3">
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
      </CanvasDots>
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
