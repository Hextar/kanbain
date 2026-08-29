import type { Task, TaskListFilters } from "../types/Task";

/**
 * TanStack Query cache keys for tasks.
 *
 * These are cache addresses (like URLs), not fields on `Task`.
 * Query uses prefix matching: invalidating `all` refetches every task query,
 * `lists()` every list, `detail(id)` one task.
 *
 *   ['tasks']
 *   ['tasks', 'list', {}]
 *   ['tasks', 'list', { projectId: '<Project.id>', columnId: '<Column.id>' }]
 *   ['tasks', 'detail', '<Task.id>']
 */
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters: TaskListFilters = {}) =>
    [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: Task["id"]) => [...taskKeys.details(), id] as const,
};
