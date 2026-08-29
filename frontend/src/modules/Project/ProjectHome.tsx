"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ConfirmDialog from "@uiKit/ConfirmDialog";
import NewProjectForm from "./components/NewProjectForm";
import ProjectCard from "./components/ProjectCard";
import ProjectEmptyState from "./components/ProjectEmptyState";
import { deleteProjectAction } from "./actions/deleteProject";
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
  const { data: projects = [], warmingIds } = useProjects(initial);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
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
      <header className="flex items-center justify-between gap-4 p-6 pr-20">
        <h1 className="text-3xl font-bold text-white">KanbAIn</h1>
        {hasProjects ? <NewProjectForm onCreated={remember} /> : null}
      </header>
      {hasProjects ? (
        <ul className="grid grid-cols-1 gap-4 overflow-y-auto px-6 pb-8 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id} className="min-w-0">
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
          void handleDelete(project.id);
        }}
      />
    </div>
  );
}
