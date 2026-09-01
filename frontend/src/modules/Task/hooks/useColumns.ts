import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumn as createColumnApi,
  deleteColumn as deleteColumnApi,
  getColumns,
  updateColumn as updateColumnApi,
} from "../api/columns";
import { columnKeys } from "../api/columnKeys";
import { defaultColumnColor } from "../helpers/columnAccent";
import { showToast } from "@libraries/toast";
import type { Column, ColumnItem, CreateColumnInput } from "../types/Column";

function compareColumnsByOrder(left: Column, right: Column) {
  return left.order - right.order || left.id.localeCompare(right.id);
}

function withRenumberedOrders(list: Column[]): Column[] {
  return list.map((column, index) =>
    column.order === index ? column : { ...column, order: index },
  );
}

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
    const order = queryClient.getQueryData<Column[]>(listKey)?.length ?? 0;
    const column: Column = {
      id: input.id ?? crypto.randomUUID(),
      projectId: nextProjectId,
      title: input.title,
      order,
      color: input.color ?? defaultColumnColor(order),
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
          color: column.color,
        });
      } catch {
        setListData((current) =>
          current.filter((item) => item.id !== column.id),
        );
        showToast("Couldn't create the column.");
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
      } catch {
        if (previous) {
          setListData((current) =>
            current.map((item) => (item.id === previous.id ? previous : item)),
          );
        }
        showToast("Couldn't save the column.");
      }
    });
  }

  function move(columnId: Column["id"], targetIndex: number) {
    const previous = (
      queryClient.getQueryData<Column[]>(listKey) ?? []
    ).toSorted(compareColumnsByOrder);
    const sourceIndex = previous.findIndex((item) => item.id === columnId);
    if (sourceIndex < 0) return;

    const without = previous.filter((item) => item.id !== columnId);
    const clamped = Math.max(0, Math.min(targetIndex, without.length));
    if (clamped === sourceIndex) return;

    const moved = previous[sourceIndex];
    const next = withRenumberedOrders([
      ...without.slice(0, clamped),
      moved,
      ...without.slice(clamped),
    ]);
    const nextMoved = next.find((item) => item.id === columnId);
    if (!nextMoved) return;

    void withSaving(columnId, async () => {
      queryClient.setQueryData<Column[]>(listKey, next);
      try {
        await updateColumnMutation(nextMoved);
      } catch {
        queryClient.setQueryData<Column[]>(listKey, previous);
        showToast("Couldn't move the column.");
      }
    });
  }

  function remove(id: Column["id"]) {
    const previous = queryClient.getQueryData<Column[]>(listKey) ?? [];

    void withSaving(id, async () => {
      setListData((current) => current.filter((item) => item.id !== id));
      try {
        await deleteColumnMutation(id);
      } catch {
        queryClient.setQueryData<Column[]>(listKey, previous);
        showToast("Couldn't delete the column.");
      }
    });
  }

  const columnItems: ColumnItem[] = (query.data ?? [])
    .toSorted(compareColumnsByOrder)
    .map((column) => ({
      ...column,
      isSaving: savingColumnIds.has(column.id),
    }));

  return {
    columns: columnItems,
    isLoading: query.isLoading,
    error: query.error,
    createColumn: create,
    updateColumn: update,
    moveColumn: move,
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
