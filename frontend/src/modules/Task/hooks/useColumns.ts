import { useOptimistic, useState, useTransition } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumn as createColumnApi,
  deleteColumn as deleteColumnApi,
  getColumns,
  updateColumn as updateColumnApi,
} from "../api/columns";
import { columnKeys } from "../api/columnKeys";
import type { Column, ColumnItem, CreateColumnInput } from "../types/Column";

type ColumnOptimisticAction =
  | { type: "add"; column: Column }
  | { type: "update"; column: Column }
  | { type: "delete"; id: Column["id"] };

export function useColumns(projectId: string, initialColumns?: Column[]) {
  const query = useQuery({
    queryKey: columnKeys.list(projectId),
    queryFn: () => getColumns(projectId),
    initialData: initialColumns,
  });
  const { mutateAsync: createColumnMutation } = useCreateColumn();
  const { mutateAsync: updateColumnMutation } = useUpdateColumn();
  const { mutateAsync: deleteColumnMutation } = useDeleteColumn();
  const [, startTransition] = useTransition();
  const [savingColumnIds, setSavingColumnIds] = useState<
    ReadonlySet<Column["id"]>
  >(new Set());

  const columns = query.data ?? [];
  const [optimisticColumns, applyOptimistic] = useOptimistic(
    columns,
    (currentColumns: Column[], action: ColumnOptimisticAction) => {
      switch (action.type) {
        case "add":
          if (currentColumns.some((column) => column.id === action.column.id))
            return currentColumns;
          return [...currentColumns, action.column];
        case "update":
          return currentColumns.map((column) =>
            column.id === action.column.id ? action.column : column,
          );
        case "delete":
          return currentColumns.filter((column) => column.id !== action.id);
      }
    },
  );

  function withSaving(id: Column["id"], action: () => Promise<unknown>) {
    startTransition(async () => {
      setSavingColumnIds((current) => new Set(current).add(id));
      try {
        await action();
      } finally {
        setSavingColumnIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    });
  }

  function create(
    input: Omit<CreateColumnInput, "projectId"> & { projectId?: string },
  ) {
    const nextProjectId = input.projectId ?? projectId;
    const column: Column = {
      id: input.id ?? crypto.randomUUID(),
      projectId: nextProjectId,
      title: input.title,
      order: optimisticColumns.length,
    };

    withSaving(column.id, async () => {
      applyOptimistic({ type: "add", column });
      await createColumnMutation({
        ...input,
        id: column.id,
        projectId: nextProjectId,
      });
    });
  }

  function update(column: Column) {
    withSaving(column.id, async () => {
      applyOptimistic({ type: "update", column });
      await updateColumnMutation(column);
    });
  }

  function remove(id: Column["id"]) {
    withSaving(id, async () => {
      applyOptimistic({ type: "delete", id });
      await deleteColumnMutation(id);
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
    updateColumn: update,
    deleteColumn: remove,
  };
}

function useCreateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createColumnApi,
    onSuccess: (created) => {
      queryClient.setQueryData<Column[]>(
        columnKeys.list(created.projectId),
        (current) => {
          if (!current) return [created];
          if (current.some((column) => column.id === created.id))
            return current;
          return [...current, created];
        },
      );
      void queryClient.invalidateQueries({ queryKey: columnKeys.lists() });
    },
  });
}

function useUpdateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateColumnApi,
    onSuccess: (updated) => {
      queryClient.setQueryData<Column[]>(
        columnKeys.list(updated.projectId),
        (current) =>
          current?.map((column) =>
            column.id === updated.id ? updated : column,
          ),
      );
      void queryClient.invalidateQueries({ queryKey: columnKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: columnKeys.detail(updated.id),
      });
    },
  });
}

function useDeleteColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteColumnApi,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: columnKeys.lists() });
    },
    onSuccess: (_result, id) => {
      queryClient.setQueriesData<Column[]>(
        { queryKey: columnKeys.lists() },
        (current) => current?.filter((column) => column.id !== id),
      );
      queryClient.removeQueries({ queryKey: columnKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: columnKeys.lists() });
    },
  });
}
