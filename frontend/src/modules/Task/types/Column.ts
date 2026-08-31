import type { ColumnColorId } from "../helpers/columnAccent";

export type Column = {
  id: string;
  projectId: string;
  title: string;
  order: number;
  color: ColumnColorId;
};

export type CreateColumnInput = {
  id?: Column["id"];
  projectId: string;
  title: string;
  color?: ColumnColorId;
};

export type ColumnItem = Column & {
  isSaving?: boolean;
};
