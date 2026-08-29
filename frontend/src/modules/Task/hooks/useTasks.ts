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
import { taskKeys } from "../api/taskKeys";
import type {
  CreateTaskInput,
  Task,
  TaskItem,
  TaskListFilters,
} from "../types/Task";

function withoutSaving(task: TaskItem | Task): Task {
  const next = { ...task } as TaskItem;
  delete next.isSaving;
  return next;
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
      return [...current, task];
    });
  }
  queryClient.setQueryData(taskKeys.detail(task.id), task);
}

export function useTasks(
  filters: TaskListFilters = {},
  initialTasks?: Task[],
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => getTasks(filters),
    initialData: initialTasks,
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

    const task: Task = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      columnId,
      projectId: input.projectId ?? filters.projectId,
      description: input.description,
      priority: input.priority,
      category: input.category,
      estimateTshirt: input.estimateTshirt,
      assigneeId: input.assigneeId,
      milestoneId: input.milestoneId,
      tags: input.tags,
    };

    void withSaving(task.id, async () => {
      setListData((current) =>
        current.some((item) => item.id === task.id)
          ? current
          : [...current, task],
      );
      try {
        await createTaskMutation({ ...input, id: task.id, columnId });
      } catch (error) {
        setListData((current) => current.filter((item) => item.id !== task.id));
        throw error;
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
      } catch (error) {
        if (previous) {
          setListData((current) =>
            current.map((item) => (item.id === previous.id ? previous : item)),
          );
        }
        throw error;
      }
    });
  }

  function remove(id: Task["id"]) {
    const previous = queryClient.getQueryData<Task[]>(listKey) ?? [];

    void withSaving(id, async () => {
      setListData((current) => current.filter((item) => item.id !== id));
      try {
        await deleteTaskMutation(id);
      } catch (error) {
        queryClient.setQueryData<Task[]>(listKey, previous);
        throw error;
      }
    });
  }

  const taskItems: TaskItem[] = (query.data ?? []).map((task) => ({
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
      queryClient.setQueryData<Task[]>(
        taskKeys.list({
          columnId: created.columnId,
          projectId: created.projectId,
        }),
        (current) => {
          if (!current) return [created];
          if (current.some((task) => task.id === created.id)) {
            return current.map((task) =>
              task.id === created.id ? created : task,
            );
          }
          return [...current, created];
        },
      );
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

export function useMoveTask() {
  const queryClient = useQueryClient();
  const { mutateAsync: updateTaskMutation } = useUpdateTask();

  const moveTask = useCallback(
    (
      taskId: Task["id"],
      sourceColumnId: Task["columnId"],
      targetColumnId: Task["columnId"],
      projectId?: Task["projectId"],
    ) => {
      if (sourceColumnId === targetColumnId) return;

      const sourceKey = taskKeys.list({
        columnId: sourceColumnId,
        projectId,
      });
      const targetKey = taskKeys.list({
        columnId: targetColumnId,
        projectId,
      });
      const sourceList = queryClient.getQueryData<Task[]>(sourceKey) ?? [];
      const task = sourceList.find((item) => item.id === taskId);
      if (!task) return;

      const moved: Task = { ...withoutSaving(task), columnId: targetColumnId };
      const previousSource = queryClient.getQueryData<Task[]>(sourceKey);
      const previousTarget = queryClient.getQueryData<Task[]>(targetKey);

      queryClient.setQueryData<Task[]>(sourceKey, (current) =>
        (current ?? []).filter((item) => item.id !== taskId),
      );
      queryClient.setQueryData<Task[]>(targetKey, (current) => {
        const list = current ?? [];
        if (list.some((item) => item.id === taskId)) {
          return list.map((item) => (item.id === taskId ? moved : item));
        }
        return [...list, moved];
      });

      void updateTaskMutation(moved).catch(() => {
        queryClient.setQueryData(sourceKey, previousSource);
        queryClient.setQueryData(targetKey, previousTarget);
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
      queryClient.setQueriesData<Task[]>(
        { queryKey: taskKeys.lists() },
        (current) => current?.filter((task) => task.id !== id),
      );
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
    },
  });
}
