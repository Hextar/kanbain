import { apiFetch, expectOk, readJson } from "@api/env";
import type { CreateTaskInput, Task, TaskListFilters } from "../types/Task";
import { taskFromJson, taskToJson, type TaskJson } from "../helpers/taskJson";

const TASKS_URL = "/api/tasks";

function tasksUrl(filters: TaskListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.columnId) params.set("columnId", filters.columnId);
  if (filters.category) params.set("category", filters.category);
  if (filters.priority) params.set("priority", filters.priority);
  const query = params.toString();
  return query ? `${TASKS_URL}?${query}` : TASKS_URL;
}

export async function getTasks(filters: TaskListFilters = {}): Promise<Task[]> {
  const payload = await readJson<TaskJson[]>(
    await apiFetch(tasksUrl(filters)),
    "Failed to load tasks",
  );
  return payload.map(taskFromJson);
}

export async function getTask(id: Task["id"]): Promise<Task> {
  const payload = await readJson<TaskJson>(
    await apiFetch(`${TASKS_URL}/${id}`),
    `Task ${id} not found`,
  );
  return taskFromJson(payload);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const payload = await readJson<TaskJson>(
    await apiFetch(TASKS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create task",
  );
  return taskFromJson(payload);
}

export async function updateTask(task: Task): Promise<Task> {
  const payload = await readJson<TaskJson>(
    await apiFetch(`${TASKS_URL}/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskToJson(task)),
    }),
    `Task ${task.id} not found`,
  );
  return taskFromJson(payload);
}

export async function deleteTask(id: Task["id"]): Promise<void> {
  await expectOk(
    await apiFetch(`${TASKS_URL}/${id}`, { method: "DELETE" }),
    `Failed to delete task ${id}`,
  );
}
