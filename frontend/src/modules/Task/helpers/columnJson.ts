import type { Column } from "../types/Column";

export type ColumnJson = {
  id: string;
  projectId: string;
  title: string;
  order: number;
};

export function columnFromJson(json: ColumnJson): Column {
  return {
    id: json.id,
    projectId: json.projectId,
    title: json.title,
    order: json.order,
  };
}

export function columnToJson(column: Column): ColumnJson {
  return {
    id: column.id,
    projectId: column.projectId,
    title: column.title,
    order: column.order,
  };
}
