"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "../api/projectKeys";
import { fetchProject, fetchProjects } from "../api/projectsClient";
import { warmupProjectBoard } from "../helpers/projectBoard";
import { keepProjectListOrder } from "../helpers/projectList";
import type { Project } from "../types/Project";

function isPlanning(project: Project | undefined) {
  return project?.planStatus === "planning";
}

export function useProjects(initialProjects: Project[]) {
  const queryClient = useQueryClient();
  const seenPlanningIds = useRef(new Set<string>());
  const warmingIdsRef = useRef(new Set<string>());
  const [warmingIds, setWarmingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const query = useQuery({
    queryKey: projectKeys.list(),
    queryFn: fetchProjects,
    initialData: initialProjects,
    structuralSharing: (current, incoming) =>
      keepProjectListOrder(
        current as Project[] | undefined,
        incoming as Project[],
      ),
    refetchInterval: (queryState) =>
      queryState.state.data?.some(isPlanning) ? 2000 : false,
  });

  useEffect(() => {
    const projects = query.data ?? [];
    for (const project of projects) {
      queryClient.setQueryData(projectKeys.detail(project.id), project);

      if (project.planStatus === "planning") {
        if (!seenPlanningIds.current.has(project.id)) {
          queryClient.removeQueries({ queryKey: projectKeys.board(project.id) });
        }
        seenPlanningIds.current.add(project.id);
        continue;
      }

      if (project.planStatus !== "ready") continue;
      if (!seenPlanningIds.current.has(project.id)) continue;
      if (warmingIdsRef.current.has(project.id)) continue;

      seenPlanningIds.current.delete(project.id);
      warmingIdsRef.current.add(project.id);
      setWarmingIds((current) => new Set(current).add(project.id));
      void warmupProjectBoard(queryClient, project.id).finally(() => {
        warmingIdsRef.current.delete(project.id);
        setWarmingIds((current) => {
          const next = new Set(current);
          next.delete(project.id);
          return next;
        });
      });
    }
  }, [query.data, queryClient]);

  return { ...query, warmingIds };
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
