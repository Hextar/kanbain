"use client";

import { useQuery } from "@tanstack/react-query";
import { projectKeys } from "../api/projectKeys";
import { fetchProject, fetchProjects } from "../api/projectsClient";
import type { Project } from "../types/Project";

function isPlanning(project: Project | undefined) {
  return project?.planStatus === "planning";
}

export function useProjects(initialProjects: Project[]) {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: fetchProjects,
    initialData: initialProjects,
    refetchInterval: (query) =>
      query.state.data?.some(isPlanning) ? 2000 : false,
  });
}

export function useProject(initialProject: Project) {
  return useQuery({
    queryKey: projectKeys.detail(initialProject.id),
    queryFn: () => fetchProject(initialProject.id),
    initialData: initialProject,
    refetchInterval: (query) =>
      isPlanning(query.state.data) ? 2000 : false,
  });
}
