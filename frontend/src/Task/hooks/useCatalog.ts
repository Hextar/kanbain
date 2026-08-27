import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAssignee,
  createTag,
  getAssignees,
  getTags,
} from "../api/catalog";
import { createMilestone, getMilestones } from "../api/milestones";
import { catalogKeys } from "../api/catalogKeys";

export function useAssignees() {
  return useQuery({
    queryKey: catalogKeys.assignees,
    queryFn: getAssignees,
  });
}

export function useTags() {
  return useQuery({
    queryKey: catalogKeys.tags,
    queryFn: getTags,
  });
}

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: catalogKeys.milestones(projectId),
    queryFn: () => getMilestones(projectId),
  });
}

export function useCreateAssignee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAssignee,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.assignees });
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.tags });
    },
  });
}

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => createMilestone(projectId, title),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: catalogKeys.milestones(projectId),
      });
    },
  });
}
