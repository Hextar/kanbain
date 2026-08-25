"use client";

import KanbanHeader from "./components/KanbanHeader";
import NewColumn from "./components/NewColumn";
import TaskColumn from "./components/TaskColumn";
import { useColumns } from "./hooks/useColumns";
import type { Project } from "@/Project/types/Project";
import type { Column } from "./types/Column";

type KanbanBoardProps = {
  project: Pick<Project, "id" | "name">;
  initialColumns?: Column[];
};

export default function KanbanBoard({
  project,
  initialColumns,
}: KanbanBoardProps) {
  const { columns, createColumn, deleteColumn } = useColumns(project.id, initialColumns);

  return (
    <div className="flex h-dvh w-full max-w-full flex-col items-start justify-center">
      <KanbanHeader className="w-full" projectName={project.name} />
      <div className="flex h-full max-w-full flex-row items-start justify-start gap-4 overflow-x-auto p-4 pt-0">
        {columns.map((column) => (
          <TaskColumn
            key={column.id}
            column={column}
            onDelete={() => deleteColumn(column.id)}
          />
        ))}
        <NewColumn onSubmit={(title) => createColumn({ title })} />
      </div>
    </div>
  );
}
