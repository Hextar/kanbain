import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumn as createColumnApi,
  deleteColumn as deleteColumnApi,
  getColumns,
  updateColumn as updateColumnApi,
} from "../api/columns";
import { columnKeys } from "../api/columnKeys";
import type { Column, ColumnItem, CreateColumnInput } from "../types/Column";

export function useColumns(projectId: string, initialColumns?: Column[]) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: columnKeys.list(projectId),
    queryFn: () => getColumns(projectId),
    initialData: initialColumns,
  });
  const { mutateAsync: createColumnMutation } = useCreateColumn();
  const { mutateAsync: updateColumnMutation } = useUpdateColumn();
  const { mutateAsync: deleteColumnMutation } = useDeleteColumn();
  const [savingColumnIds, setSavingColumnIds] = useState<
    ReadonlySet<Column["id"]>
  >(new Set());

  const listKey = columnKeys.list(projectId);

  function setListData(updater: (current: Column[]) => Column[]) {
    queryClient.setQueryData<Column[]>(listKey, (current) =>
      updater(current ?? []),
    );
  }

  async function withSaving(id: Column["id"], action: () => Promise<unknown>) {
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
  }

  function create(
    input: Omit<CreateColumnInput, "projectId"> & { projectId?: string },
  ) {
    const nextProjectId = input.projectId ?? projectId;
    const column: Column = {
      id: input.id ?? crypto.randomUUID(),
      projectId: nextProjectId,
      title: input.title,
      order: queryClient.getQueryData<Column[]>(listKey)?.length ?? 0,
    };

    void withSaving(column.id, async () => {
      setListData((current) =>
        current.some((item) => item.id === column.id)
          ? current
          : [...current, column],
      );
      try {
        await createColumnMutation({
          ...input,
          id: column.id,
          projectId: nextProjectId,
        });
      } catch (error) {
        setListData((current) =>
          current.filter((item) => item.id !== column.id),
        );
        throw error;
      }
    });
  }

  function update(column: Column) {
    const previous =
      queryClient
        .getQueryData<Column[]>(listKey)
        ?.find((item) => item.id === column.id) ?? null;

    void withSaving(column.id, async () => {
      setListData((current) =>
        current.map((item) => (item.id === column.id ? column : item)),
      );
      try {
        await updateColumnMutation(column);
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

  function remove(id: Column["id"]) {
    const previous = queryClient.getQueryData<Column[]>(listKey) ?? [];

    void withSaving(id, async () => {
      setListData((current) => current.filter((item) => item.id !== id));
      try {
        await deleteColumnMutation(id);
      } catch (error) {
        queryClient.setQueryData<Column[]>(listKey, previous);
        throw error;
      }
    });
  }

  const columnItems: ColumnItem[] = (query.data ?? []).map((column) => ({
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
          if (current.some((column) => column.id === created.id)) {
            return current.map((column) =>
              column.id === created.id ? created : column,
            );
          }
          return [...current, created];
        },
      );
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
    },
  });
}

function useDeleteColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteColumnApi,
    onSuccess: (_result, id) => {
      queryClient.setQueriesData<Column[]>(
        { queryKey: columnKeys.lists() },
        (current) => current?.filter((column) => column.id !== id),
      );
      queryClient.removeQueries({ queryKey: columnKeys.detail(id) });
    },
  });
}
