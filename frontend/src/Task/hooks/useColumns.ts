import { useOptimistic, useState, useTransition } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumn, getColumns } from '../api/columns';
import { columnKeys } from '../api/columnKeys';
import type { Column, ColumnItem, CreateColumnInput } from '../types/Column';

export function useColumns() {
    const query = useQuery({
        queryKey: columnKeys.list(),
        queryFn: getColumns,
    });
    const { mutateAsync } = useCreateColumn();
    const [, startTransition] = useTransition();
    const [savingColumnIds, setSavingColumnIds] = useState<ReadonlySet<Column['id']>>(new Set());

    const columns = query.data ?? [];
    const [optimisticColumns, addOptimisticColumn] = useOptimistic(
        columns,
        (currentColumns: Column[], created: Column) => {
            if (currentColumns.some((column) => column.id === created.id)) return currentColumns;
            return [...currentColumns, created];
        },
    );

    function create(input: CreateColumnInput) {
        const column: Column = {
            id: input.id ?? crypto.randomUUID(),
            title: input.title,
            order: optimisticColumns.length,
        };

        startTransition(async () => {
            setSavingColumnIds((current) => new Set(current).add(column.id));
            addOptimisticColumn(column);
            try {
                await mutateAsync({ ...input, id: column.id });
            } finally {
                setSavingColumnIds((current) => {
                    const next = new Set(current);
                    next.delete(column.id);
                    return next;
                });
            }
        });
    }

    const columnItems: ColumnItem[] = optimisticColumns.map((column) => ({
        ...column,
        isSaving: savingColumnIds.has(column.id),
    }));

    return {
        columns: columnItems,
        isLoading: query.isLoading,
        error: query.error,
        createColumn: create,
    };
}

export function useCreateColumn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createColumn,
        onSuccess: (created) => {
            queryClient.setQueryData<Column[]>(
                columnKeys.list(),
                (current) => {
                    if (!current) return [created];
                    if (current.some((column) => column.id === created.id)) return current;
                    return [...current, created];
                },
            );
            void queryClient.invalidateQueries({ queryKey: columnKeys.all });
        },
    });
}
