import type { Column } from "../types/Column";

/**
 * TanStack Query cache keys for columns.
 *
 *   ['columns']
 *   ['columns', 'list']
 *   ['columns', 'list', '<Project.id>']
 *   ['columns', 'detail', '<Column.id>']
 */
export const columnKeys = {
  all: ["columns"] as const,
  lists: () => [...columnKeys.all, "list"] as const,
  list: (projectId: string) => [...columnKeys.lists(), projectId] as const,
  details: () => [...columnKeys.all, "detail"] as const,
  detail: (id: Column["id"]) => [...columnKeys.details(), id] as const,
};
