import { useOptimistic, useState, useTransition } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask, deleteTask, getTask, getTasks, updateTask } from '../api/tasks';
import { taskKeys } from '../api/taskKeys';
import type { CreateTaskInput, Task, TaskItem, TaskListFilters } from '../types/Task';

type TaskOptimisticAction =
    | { type: 'add'; task: Task }
    | { type: 'update'; task: Task }
    | { type: 'delete'; id: Task['id'] };

export function useTasks(filters: TaskListFilters = {}) {
    const query = useQuery({
        queryKey: taskKeys.list(filters),
        queryFn: () => getTasks(filters),
    });
    const { mutateAsync: createTaskMutation } = useCreateTask();
    const { mutateAsync: updateTaskMutation } = useUpdateTask();
    const { mutateAsync: deleteTaskMutation } = useDeleteTask();
    const [, startTransition] = useTransition();
    const [savingTaskIds, setSavingTaskIds] = useState<ReadonlySet<Task['id']>>(new Set());

    const tasks = query.data ?? [];
    const [optimisticTasks, applyOptimistic] = useOptimistic(
        tasks,
        (currentTasks: Task[], action: TaskOptimisticAction) => {
            switch (action.type) {
                case 'add':
                    if (currentTasks.some((task) => task.id === action.task.id)) return currentTasks;
                    return [...currentTasks, action.task];
                case 'update':
                    return currentTasks.map((task) => (task.id === action.task.id ? action.task : task));
                case 'delete':
                    return currentTasks.filter((task) => task.id !== action.id);
            }
        },
    );

    function withSaving(id: Task['id'], action: () => Promise<unknown>) {
        startTransition(async () => {
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
        });
    }

    function create(input: Omit<CreateTaskInput, 'columnId'> & { columnId?: Task['columnId'] }) {
        const columnId = input.columnId ?? filters.columnId;
        if (!columnId) {
            throw new Error('createTask requires a columnId');
        }

        const task: Task = {
            id: input.id ?? crypto.randomUUID(),
            title: input.title,
            columnId,
            description: input.description,
            priority: input.priority,
            category: input.category,
        };

        withSaving(task.id, async () => {
            applyOptimistic({ type: 'add', task });
            await createTaskMutation({ ...input, id: task.id, columnId });
        });
    }

    function update(task: Task) {
        withSaving(task.id, async () => {
            applyOptimistic({ type: 'update', task });
            await updateTaskMutation(task);
        });
    }

    function remove(id: Task['id']) {
        withSaving(id, async () => {
            applyOptimistic({ type: 'delete', id });
            await deleteTaskMutation(id);
        });
    }

    const taskItems: TaskItem[] = optimisticTasks.map((task) => ({
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

export function useTask(id: Task['id']) {
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
                    if (current.some((task) => task.id === created.id)) return current;
                    return [...current, created];
                },
            );
            void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
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
                (current) => current?.map((item) => (item.id === task.id ? task : item)),
            );
            void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            void queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) });
        },
    });
}

export function useDeleteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteTask,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
        },
        onSuccess: (_result, id) => {
            queryClient.setQueriesData<Task[]>(
                { queryKey: taskKeys.lists() },
                (current) => current?.filter((task) => task.id !== id),
            );
            queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
            void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
        },
    });
}
