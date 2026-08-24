export type Column = {
    id: string;
    title: string;
    order: number;
};

export type CreateColumnInput = {
    id?: Column['id'];
    title: string;
};

export type ColumnItem = Column & {
    isSaving?: boolean;
};
