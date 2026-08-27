import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const { isSaving: _isSaving, ...rest } = task as TaskItem;
  return rest;
}

export function useTasks(filters: TaskListFilters = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => getTasks(filters),
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
      queryClient.getQueryData<Task[]>(listKey)?.find(
        (item) => item.id === nextTask.id,
      ) ?? null;

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
        taskKeys.list({ columnId: created.columnId }),
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
      queryClient.setQueryData<Task[]>(
        taskKeys.list({ columnId: task.columnId }),
        (current) =>
          current?.map((item) => (item.id === task.id ? task : item)),
      );
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
  });
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
