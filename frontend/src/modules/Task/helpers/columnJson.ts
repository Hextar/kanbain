import { defaultColumnColor, isColumnColorId } from "./columnAccent";
import type { Column } from "../types/Column";

export type ColumnJson = {
  id: string;
  projectId: string;
  title: string;
  order: number;
  color?: string;
};

export function columnFromJson(json: ColumnJson): Column {
  return {
    id: json.id,
    projectId: json.projectId,
    title: json.title,
    order: json.order,
    color: isColumnColorId(json.color)
      ? json.color
      : defaultColumnColor(json.order),
  };
}

export function columnToJson(column: Column): ColumnJson {
  return {
    id: column.id,
    projectId: column.projectId,
    title: column.title,
    order: column.order,
    color: column.color,
  };
}
