import type { Task } from "../types/Task";

const TASK_KEY = /^TASK-(\d+)$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatTaskKey(taskNumber: number): string {
  return `TASK-${taskNumber}`;
}

export function parseTaskKey(value: string): number | null {
  const match = TASK_KEY.exec(value.trim());
  if (!match) return null;
  const taskNumber = Number(match[1]);
  return Number.isInteger(taskNumber) && taskNumber > 0 ? taskNumber : null;
}

export function taskKey(task: Pick<Task, "taskNumber">): string | undefined {
  return task.taskNumber ? formatTaskKey(task.taskNumber) : undefined;
}

export function compactTaskKey(
  task: Pick<Task, "taskNumber">,
): string | undefined {
  return task.taskNumber ? `#${task.taskNumber}` : undefined;
}

export function findTaskByQuery(
  tasks: Task[],
  query: string | null | undefined,
): Task | undefined {
  const value = query?.trim();
  if (!value) return undefined;
  if (UUID.test(value)) {
    return tasks.find((task) => task.id === value);
  }
  const taskNumber = parseTaskKey(value);
  if (taskNumber == null) return undefined;
  return tasks.find((task) => task.taskNumber === taskNumber);
}

export function taskQueryValue(task: Task): string {
  return taskKey(task) ?? task.id;
}
