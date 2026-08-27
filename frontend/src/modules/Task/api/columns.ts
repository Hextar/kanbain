import { apiFetch, isMockApi, readJson } from "@api/env";
import * as mockDb from "@api/mockDb";
import {
  columnFromJson,
  type ColumnJson,
} from "@modules/Project/helpers/columnJson";
import type { Column, CreateColumnInput } from "../types/Column";

const COLUMNS_URL = "/api/columns";

function columnsUrl(projectId: string) {
  const params = new URLSearchParams({ projectId });
  return `${COLUMNS_URL}?${params.toString()}`;
}

export async function getColumns(projectId: string): Promise<Column[]> {
  if (typeof window === "undefined" && isMockApi()) {
    return mockDb.listColumnsFor(projectId);
  }
  const response = await apiFetch(columnsUrl(projectId));
  const payload = await readJson<ColumnJson[]>(
    response,
    "Failed to load columns",
  );
  return payload.map(columnFromJson);
}

export async function createColumn(input: CreateColumnInput): Promise<Column> {
  if (typeof window === "undefined" && isMockApi()) {
    return mockDb.insertColumn(input);
  }
  const response = await apiFetch(COLUMNS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await readJson<ColumnJson>(
    response,
    "Failed to create column",
  );
  return columnFromJson(payload);
}

export async function updateColumn(column: Column): Promise<Column> {
  if (typeof window === "undefined" && isMockApi()) {
    return mockDb.updateColumn(column.id, { title: column.title });
  }
  const response = await apiFetch(`${COLUMNS_URL}/${column.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: column.title }),
  });
  const payload = await readJson<ColumnJson>(
    response,
    "Failed to update column",
  );
  return columnFromJson(payload);
}

export async function deleteColumn(id: Column["id"]): Promise<void> {
  if (typeof window === "undefined" && isMockApi()) {
    mockDb.deleteColumn(id);
    return;
  }
  const response = await apiFetch(`${COLUMNS_URL}/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to delete column ${id}`);
  }
}
