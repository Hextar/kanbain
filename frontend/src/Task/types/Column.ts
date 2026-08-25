export type Column = {
  id: string;
  projectId: string;
  title: string;
  order: number;
};

export type CreateColumnInput = {
  id?: Column["id"];
  projectId: string;
  title: string;
};

export type ColumnItem = Column & {
  isSaving?: boolean;
};
