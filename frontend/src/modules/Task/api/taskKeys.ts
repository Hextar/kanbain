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
function stableListFilters(filters: TaskListFilters = {}): TaskListFilters {
  const next: TaskListFilters = {};
  if (filters.projectId !== undefined) next.projectId = filters.projectId;
  if (filters.columnId !== undefined) next.columnId = filters.columnId;
  if (filters.category !== undefined) next.category = filters.category;
  if (filters.priority !== undefined) next.priority = filters.priority;
  return next;
}

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters: TaskListFilters = {}) =>
    [...taskKeys.lists(), stableListFilters(filters)] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: Task["id"]) => [...taskKeys.details(), id] as const,
};
