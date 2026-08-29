import type { QueryClient } from "@tanstack/react-query";
import { getColumns } from "@modules/Task/api/columns";
import { columnKeys } from "@modules/Task/api/columnKeys";
import { getTasks } from "@modules/Task/api/tasks";
import { taskKeys } from "@modules/Task/api/taskKeys";
import type { Column } from "@modules/Task/types/Column";
import type { Task } from "@modules/Task/types/Task";
import { projectKeys } from "../api/projectKeys";

export type ProjectBoard = {
  columns: Column[];
  tasks: Task[];
};

export async function fetchProjectBoard(projectId: string): Promise<ProjectBoard> {
  const columnsPromise = getColumns(projectId);
  const tasksPromise = getTasks({ projectId });
  const [columns, tasks] = await Promise.all([columnsPromise, tasksPromise]);
  return { columns, tasks };
}

export function tasksByColumnId(board: ProjectBoard): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>();
  for (const column of board.columns) {
    grouped.set(column.id, []);
  }
  for (const task of board.tasks) {
    const tasks = grouped.get(task.columnId);
    if (tasks) {
      tasks.push(task);
      continue;
    }
    grouped.set(task.columnId, [task]);
  }
  return grouped;
}

export function seedProjectBoard(
  queryClient: QueryClient,
  projectId: string,
  board: ProjectBoard,
) {
  queryClient.setQueryData(projectKeys.board(projectId), board);
  queryClient.setQueryData(columnKeys.list(projectId), board.columns);
  const grouped = tasksByColumnId(board);
  for (const [columnId, tasks] of grouped) {
    queryClient.setQueryData(taskKeys.list({ projectId, columnId }), tasks);
  }
}

export async function warmupProjectBoard(
  queryClient: QueryClient,
  projectId: string,
) {
  const board = await fetchProjectBoard(projectId);
  seedProjectBoard(queryClient, projectId, board);
  return board;
}
