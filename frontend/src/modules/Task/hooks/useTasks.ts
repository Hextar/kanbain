import { useCallback, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  createTask,
  deleteTask,
  getTask,
  getTasks,
  updateTask,
} from "../api/tasks";
import { columnKeys } from "../api/columnKeys";
import { taskKeys } from "../api/taskKeys";
import { compareTasksByOrder } from "../helpers/taskOrder";
import { ancestorsToComplete } from "../helpers/visibleColumnCards";
import {
  nestWorkKind,
  shouldDemoteParent,
  taskTreeIds,
  unnestWorkKind,
} from "../helpers/nesting";
import { showToast } from "@libraries/toast";
import { markCelebrate } from "@libraries/particles";
import type { Column } from "../types/Column";
import type {
  CreateTaskInput,
  Task,
  TaskItem,
  TaskListFilters,
} from "../types/Task";

function cachedTasks(queryClient: QueryClient): Task[] {
  const byId = new Map<string, Task>();
  for (const [, list] of queryClient.getQueriesData<Task[]>({
    queryKey: taskKeys.lists(),
  })) {
    for (const task of list ?? []) byId.set(task.id, task);
  }
  return [...byId.values()];
}

function restoreTaskLists(
  queryClient: QueryClient,
  snapshots: [readonly unknown[], Task[] | undefined][],
) {
  for (const [queryKey, data] of snapshots) {
    queryClient.setQueryData(queryKey, data);
  }
}

function withoutSaving(task: TaskItem | Task): Task {
  const next = { ...task } as TaskItem;
  delete next.isSaving;
  return next;
}

function withRenumberedOrders(list: Task[]): Task[] {
  return list.map((task, index) =>
    task.order === index ? task : { ...task, order: index },
  );
}

function insertTaskAt(list: Task[], task: Task, index: number): Task[] {
  const clamped = Math.max(0, Math.min(index, list.length));
  const moved = { ...task, order: clamped };
  return withRenumberedOrders([
    ...list.slice(0, clamped),
    moved,
    ...list.slice(clamped),
  ]);
}

function removeTaskById(list: Task[], taskId: Task["id"]): Task[] {
  return withRenumberedOrders(list.filter((item) => item.id !== taskId));
}

function sameTaskIds(left: Task[], right: Task[]) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) {
    if (left[index].id !== right[index].id) return false;
  }
  return true;
}

function sameColumnFollowers(
  parentId: Task["id"],
  columnTasks: Task[],
  targetColumnId: Task["columnId"],
): Task[] {
  const direct = columnTasks
    .filter((item) => item.parentId === parentId)
    .toSorted(compareTasksByOrder);
  const followers: Task[] = [];
  for (const child of direct) {
    const moved = { ...withoutSaving(child), columnId: targetColumnId };
    followers.push(
      moved,
      ...sameColumnFollowers(child.id, columnTasks, targetColumnId),
    );
  }
  return followers;
}

function filtersFromListKey(queryKey: readonly unknown[]): TaskListFilters {
  const filters = queryKey[2];
  if (filters !== null && typeof filters === "object") {
    return filters as TaskListFilters;
  }
  return {};
}

function taskMatchesFilters(task: Task, filters: TaskListFilters): boolean {
  if (filters.projectId !== undefined && task.projectId !== filters.projectId) {
    return false;
  }
  if (filters.columnId !== undefined && task.columnId !== filters.columnId) {
    return false;
  }
  if (filters.category !== undefined && task.category !== filters.category) {
    return false;
  }
  if (filters.priority !== undefined && task.priority !== filters.priority) {
    return false;
  }
  return true;
}

function syncTaskInListCaches(queryClient: QueryClient, task: Task) {
  for (const [queryKey] of queryClient.getQueriesData<Task[]>({
    queryKey: taskKeys.lists(),
  })) {
    queryClient.setQueryData<Task[]>(queryKey, (current) => {
      if (!current) {
        return taskMatchesFilters(task, filtersFromListKey(queryKey))
          ? [task]
          : current;
      }
      if (!taskMatchesFilters(task, filtersFromListKey(queryKey))) {
        return current.filter((item) => item.id !== task.id);
      }
      if (current.some((item) => item.id === task.id)) {
        return current.map((item) => (item.id === task.id ? task : item));
      }
      return insertTaskAt(current, task, task.order);
    });
  }
  queryClient.setQueryData(taskKeys.detail(task.id), task);
}

function nextTaskNumber(
  queryClient: QueryClient,
  projectId: Task["projectId"],
  listKey: readonly unknown[],
): number {
  const projectTasks = projectId
    ? queryClient.getQueryData<Task[]>(taskKeys.list({ projectId }))
    : undefined;
  const source =
    projectTasks ?? queryClient.getQueryData<Task[]>(listKey) ?? [];
  let max = 0;
  for (const task of source) {
    if ((task.taskNumber ?? 0) > max) max = task.taskNumber ?? 0;
  }
  return max + 1;
}

function compareColumnsByOrder(left: Column, right: Column) {
  return left.order - right.order || left.id.localeCompare(right.id);
}

function celebrateRightwardMove(
  queryClient: QueryClient,
  taskId: Task["id"],
  sourceColumnId: Task["columnId"],
  targetColumnId: Task["columnId"],
  projectId: Task["projectId"] | undefined,
  doneColumnId: Task["columnId"] | undefined,
) {
  if (sourceColumnId === targetColumnId) return;
  const columns = (
    projectId
      ? (queryClient.getQueryData<Column[]>(columnKeys.list(projectId)) ?? [])
      : []
  ).toSorted(compareColumnsByOrder);
  const fromIndex = columns.findIndex((column) => column.id === sourceColumnId);
  const toIndex = columns.findIndex((column) => column.id === targetColumnId);
  if (fromIndex >= 0 && toIndex >= 0) {
    if (toIndex <= fromIndex) return;
    const lastId = doneColumnId ?? columns.at(-1)?.id;
    markCelebrate(taskId, targetColumnId === lastId ? "complete" : "progress");
    return;
  }
  if (doneColumnId && targetColumnId === doneColumnId) {
    markCelebrate(taskId, "complete");
  }
}

function patchTaskInCaches(
  queryClient: QueryClient,
  taskId: Task["id"],
  patch: Partial<Task>,
) {
  for (const [queryKey] of queryClient.getQueriesData<Task[]>({
    queryKey: taskKeys.lists(),
  })) {
    queryClient.setQueryData<Task[]>(queryKey, (current) =>
      current?.map((item) =>
        item.id === taskId ? { ...item, ...patch } : item,
      ),
    );
  }
  queryClient.setQueryData<Task>(taskKeys.detail(taskId), (current) =>
    current ? { ...current, ...patch } : current,
  );
}

export function useTasks(filters: TaskListFilters = {}, initialTasks?: Task[]) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => getTasks(filters),
    initialData: initialTasks,
    staleTime: 0,
  });
  const { mutateAsync: createTaskMutation } = useCreateTask();
  const { mutateAsync: updateTaskMutation } = useUpdateTask();
  const { mutateAsync: deleteTaskMutation } = useDeleteTask();
  const [savingTaskIds, setSavingTaskIds] = useState<ReadonlySet<Task["id"]>>(
    new Set(),
  );

  const listKey = taskKeys.list(filters);

  function setListData(updater: (current: Task[]) => Task[]) {
    queryClient.setQueryData<Task[]>(listKey, (current) =>
      updater(current ?? []),
    );
  }

  async function withSaving(id: Task["id"], action: () => Promise<unknown>) {
    setSavingTaskIds((current) => new Set(current).add(id));
    try {
      await action();
    } finally {
      setSavingTaskIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  function create(
    input: Omit<CreateTaskInput, "columnId"> & { columnId?: Task["columnId"] },
  ) {
    const columnId = input.columnId ?? filters.columnId;
    if (!columnId) {
      throw new Error("createTask requires a columnId");
    }

    const projectId = input.projectId ?? filters.projectId;
    const columnTasks =
      queryClient.getQueryData<Task[]>(
        taskKeys.list({ columnId, projectId }),
      ) ??
      queryClient
        .getQueryData<Task[]>(taskKeys.list({ projectId }))
        ?.filter((item) => item.columnId === columnId);
    const task: Task = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      columnId,
      order: input.order ?? columnTasks?.length ?? 0,
      taskNumber: nextTaskNumber(queryClient, projectId, listKey),
      projectId,
      description: input.description,
      priority: input.priority,
      category: input.category,
      estimateTshirt: input.estimateTshirt,
      assigneeId: input.assigneeId,
      milestoneId: input.milestoneId,
      parentId: input.parentId,
      workKind: input.workKind ?? "task",
      tags: input.tags,
    };

    void withSaving(task.id, async () => {
      syncTaskInListCaches(queryClient, task);
      try {
        await createTaskMutation({
          ...input,
          id: task.id,
          columnId,
          order: task.order,
          projectId,
        });
      } catch {
        for (const [queryKey] of queryClient.getQueriesData<Task[]>({
          queryKey: taskKeys.lists(),
        })) {
          queryClient.setQueryData<Task[]>(queryKey, (current) =>
            current?.filter((item) => item.id !== task.id),
          );
        }
        queryClient.removeQueries({ queryKey: taskKeys.detail(task.id) });
        showToast("Couldn't create the card.");
      }
    });
  }

  function update(task: Task | TaskItem) {
    const nextTask = withoutSaving(task);
    const previous =
      queryClient
        .getQueryData<Task[]>(listKey)
        ?.find((item) => item.id === nextTask.id) ?? null;

    void withSaving(nextTask.id, async () => {
      setListData((current) =>
        current.map((item) => (item.id === nextTask.id ? nextTask : item)),
      );
      try {
        await updateTaskMutation(nextTask);
      } catch {
        if (previous) {
          setListData((current) =>
            current.map((item) => (item.id === previous.id ? previous : item)),
          );
        }
        showToast("Couldn't save the card.");
      }
    });
  }

  function remove(id: Task["id"]) {
    const snapshots = queryClient.getQueriesData<Task[]>({
      queryKey: taskKeys.lists(),
    });
    const ids = taskTreeIds(id, cachedTasks(queryClient));

    void withSaving(id, async () => {
      queryClient.setQueriesData<Task[]>(
        { queryKey: taskKeys.lists() },
        (current) => current?.filter((item) => !ids.has(item.id)),
      );
      for (const taskId of ids) {
        queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });
      }
      try {
        await deleteTaskMutation(id);
      } catch {
        restoreTaskLists(queryClient, snapshots);
        showToast("Couldn't delete the card.");
      }
    });
  }

  const taskItems: TaskItem[] = (query.data ?? [])
    .toSorted(compareTasksByOrder)
    .map((task) => ({
      ...task,
      isSaving: savingTaskIds.has(task.id),
    }));

  return {
    tasks: taskItems,
    tasksCount: taskItems.length,
    isLoading: query.isLoading,
    error: query.error,
    createTask: create,
    updateTask: update,
    deleteTask: remove,
  };
}

export function useTask(id: Task["id"]) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => getTask(id),
    enabled: id.length > 0,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: (created) => {
      syncTaskInListCaches(queryClient, created);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSuccess: (task) => {
      syncTaskInListCaches(queryClient, task);
    },
  });
}

export type MoveTaskOptions = {
  parentId?: string | null;
};

export function useMoveTask() {
  const queryClient = useQueryClient();
  const { mutateAsync: updateTaskMutation } = useUpdateTask();

  const moveTask = useCallback(
    (
      taskId: Task["id"],
      sourceColumnId: Task["columnId"],
      targetColumnId: Task["columnId"],
      targetIndex: number,
      projectId?: Task["projectId"],
      doneColumnId?: Task["columnId"],
      options?: MoveTaskOptions,
    ) => {
      const sourceKey = taskKeys.list({
        columnId: sourceColumnId,
        projectId,
      });
      const targetKey = taskKeys.list({
        columnId: targetColumnId,
        projectId,
      });
      const projectKey = projectId ? taskKeys.list({ projectId }) : undefined;
      const sourceList = (
        queryClient.getQueryData<Task[]>(sourceKey) ?? []
      ).toSorted(compareTasksByOrder);
      const sourceIndex = sourceList.findIndex((item) => item.id === taskId);
      if (sourceIndex < 0) return;

      const sourceTask = withoutSaving(sourceList[sourceIndex]);
      const parentSpecified = Boolean(options && "parentId" in options);
      const nextParentId = parentSpecified
        ? (options?.parentId ?? undefined)
        : sourceTask.parentId;

      const sameColumn = sourceColumnId === targetColumnId;
      if (
        sameColumn &&
        targetIndex === sourceIndex &&
        nextParentId === sourceTask.parentId
      ) {
        return;
      }

      const destinationList = (
        sameColumn
          ? sourceList
          : (queryClient.getQueryData<Task[]>(targetKey) ?? []).toSorted(
              compareTasksByOrder,
            )
      ).filter((item) => item.id !== taskId);
      const followers = sameColumn
        ? []
        : sameColumnFollowers(taskId, sourceList, targetColumnId);
      const followerIds = new Set(followers.map((item) => item.id));
      const clampedIndex = Math.max(
        0,
        Math.min(
          targetIndex,
          destinationList.filter((item) => !followerIds.has(item.id)).length,
        ),
      );

      const projectTasks = (projectKey
        ? queryClient.getQueryData<Task[]>(projectKey)
        : undefined) ?? [...sourceList, ...destinationList];

      let moved: Task = {
        ...sourceTask,
        columnId: targetColumnId,
        order: clampedIndex,
      };
      if (parentSpecified) {
        if (nextParentId) {
          const parent = projectTasks.find((item) => item.id === nextParentId);
          if (parent) {
            const kinds = nestWorkKind(sourceTask, parent, projectTasks);
            moved = {
              ...moved,
              parentId: nextParentId,
              workKind: kinds.movedWorkKind,
            };
          } else {
            moved = { ...moved, parentId: nextParentId };
          }
        } else {
          moved = {
            ...moved,
            workKind: unnestWorkKind(sourceTask, projectTasks),
          };
          delete moved.parentId;
        }
      }

      let nextDestination = insertTaskAt(
        destinationList.filter((item) => !followerIds.has(item.id)),
        moved,
        clampedIndex,
      );
      let followerIndex =
        nextDestination.findIndex((item) => item.id === moved.id) + 1;
      for (const follower of followers) {
        nextDestination = insertTaskAt(
          nextDestination.filter((item) => item.id !== follower.id),
          follower,
          followerIndex,
        );
        followerIndex += 1;
      }
      if (
        sameColumn &&
        (moved.parentId ?? undefined) === (sourceTask.parentId ?? undefined) &&
        moved.workKind === sourceTask.workKind &&
        sameTaskIds(sourceList, nextDestination)
      ) {
        return;
      }
      const previous = new Map<string, Task[] | undefined>();
      const remember = (key: readonly unknown[]) => {
        const cacheKey = JSON.stringify(key);
        if (!previous.has(cacheKey)) {
          previous.set(cacheKey, queryClient.getQueryData<Task[]>(key));
        }
      };
      remember(sourceKey);
      remember(targetKey);
      if (projectKey) remember(projectKey);

      if (sameColumn) {
        queryClient.setQueryData<Task[]>(sourceKey, nextDestination);
      } else {
        queryClient.setQueryData<Task[]>(
          sourceKey,
          withRenumberedOrders(
            sourceList.filter(
              (item) => item.id !== taskId && !followerIds.has(item.id),
            ),
          ),
        );
        queryClient.setQueryData<Task[]>(targetKey, nextDestination);
      }
      if (projectKey) {
        queryClient.setQueryData<Task[]>(projectKey, (current) =>
          current?.map((item) => {
            if (item.id === moved.id) return moved;
            const follower = followers.find((child) => child.id === item.id);
            return follower ?? item;
          }),
        );
      }

      if (parentSpecified) {
        if (nextParentId) {
          const parent = projectTasks.find((item) => item.id === nextParentId);
          if (parent) {
            const kinds = nestWorkKind(sourceTask, parent, projectTasks);
            if (kinds.parentWorkKind) {
              patchTaskInCaches(queryClient, parent.id, {
                workKind: kinds.parentWorkKind,
              });
            }
          }
        }
        const previousParentId = sourceTask.parentId;
        if (previousParentId && previousParentId !== nextParentId) {
          const remaining = projectTasks.filter(
            (item) =>
              item.parentId === previousParentId && item.id !== moved.id,
          ).length;
          const oldParent = projectTasks.find(
            (item) => item.id === previousParentId,
          );
          if (oldParent && shouldDemoteParent(oldParent, remaining)) {
            patchTaskInCaches(queryClient, oldParent.id, { workKind: "task" });
          }
        }
      }

      const latestProjectTasks =
        (projectKey
          ? queryClient.getQueryData<Task[]>(projectKey)
          : undefined) ?? [];
      const ancestors =
        doneColumnId && projectId
          ? ancestorsToComplete(moved, latestProjectTasks, doneColumnId)
          : [];

      celebrateRightwardMove(
        queryClient,
        taskId,
        sourceColumnId,
        targetColumnId,
        projectId,
        doneColumnId,
      );

      for (const ancestor of ancestors) {
        const fromKey = taskKeys.list({
          columnId: ancestor.fromColumnId,
          projectId,
        });
        const toKey = taskKeys.list({
          columnId: ancestor.task.columnId,
          projectId,
        });
        remember(fromKey);
        remember(toKey);
        const fromList = queryClient.getQueryData<Task[]>(fromKey) ?? [];
        const toList = (
          ancestor.fromColumnId === ancestor.task.columnId
            ? fromList
            : (queryClient.getQueryData<Task[]>(toKey) ?? [])
        ).filter((item) => item.id !== ancestor.task.id);
        const placed = insertTaskAt(toList, ancestor.task, toList.length);
        if (ancestor.fromColumnId === ancestor.task.columnId) {
          queryClient.setQueryData<Task[]>(fromKey, placed);
        } else {
          queryClient.setQueryData<Task[]>(
            fromKey,
            removeTaskById(fromList, ancestor.task.id),
          );
          queryClient.setQueryData<Task[]>(toKey, placed);
        }
        if (projectKey) {
          queryClient.setQueryData<Task[]>(projectKey, (current) =>
            current?.map((item) =>
              item.id === ancestor.task.id ? ancestor.task : item,
            ),
          );
        }
      }

      void updateTaskMutation(moved)
        .then(() => {
          for (const follower of followers) {
            syncTaskInListCaches(queryClient, follower);
          }
        })
        .catch(() => {
          for (const [cacheKey, value] of previous) {
            queryClient.setQueryData(
              JSON.parse(cacheKey) as readonly unknown[],
              value,
            );
          }
          showToast("Couldn't move the card.");
        });
    },
    [queryClient, updateTaskMutation],
  );

  return { moveTask };
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: (_result, id) => {
      const ids = taskTreeIds(id, cachedTasks(queryClient));
      queryClient.setQueriesData<Task[]>(
        { queryKey: taskKeys.lists() },
        (current) => current?.filter((task) => !ids.has(task.id)),
      );
      for (const taskId of ids) {
        queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });
      }
    },
  });
}
