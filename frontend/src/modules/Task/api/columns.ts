import { apiFetch, expectOk, readJson } from "@api/env";
import { columnFromJson, type ColumnJson } from "../helpers/columnJson";
import type { Column, CreateColumnInput } from "../types/Column";

const COLUMNS_URL = "/api/columns";

function columnsUrl(projectId: string) {
  const params = new URLSearchParams({ projectId });
  return `${COLUMNS_URL}?${params.toString()}`;
}

export async function getColumns(projectId: string): Promise<Column[]> {
  const payload = await readJson<ColumnJson[]>(
    await apiFetch(columnsUrl(projectId)),
    "Failed to load columns",
  );
  return payload.map(columnFromJson);
}

export async function createColumn(input: CreateColumnInput): Promise<Column> {
  const payload = await readJson<ColumnJson>(
    await apiFetch(COLUMNS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create column",
  );
  return columnFromJson(payload);
}

export async function updateColumn(column: Column): Promise<Column> {
  const payload = await readJson<ColumnJson>(
    await apiFetch(`${COLUMNS_URL}/${column.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: column.title,
        order: column.order,
        color: column.color,
      }),
    }),
    "Failed to update column",
  );
  return columnFromJson(payload);
}

export async function deleteColumn(id: Column["id"]): Promise<void> {
  await expectOk(
    await apiFetch(`${COLUMNS_URL}/${id}`, { method: "DELETE" }),
    `Failed to delete column ${id}`,
  );
}
