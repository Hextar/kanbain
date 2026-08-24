import type { CreateTaskInput, Task, TaskListFilters } from '../types/Task';
import { taskFromJson, taskToJson, type TaskJson } from '../helpers/taskJson';

const TASKS_URL = '/api/tasks';

function tasksUrl(filters: TaskListFilters = {}) {
    const params = new URLSearchParams();
    if (filters.columnId) params.set('columnId', filters.columnId);
    if (filters.category) params.set('category', filters.category);
    if (filters.priority) params.set('priority', filters.priority);
    const query = params.toString();
    return query ? `${TASKS_URL}?${query}` : TASKS_URL;
}

async function readJson<T>(response: Response, errorMessage: string): Promise<T> {
    if (!response.ok) {
        throw new Error(errorMessage);
    }
    return response.json() as Promise<T>;
}

export async function getTasks(filters: TaskListFilters = {}): Promise<Task[]> {
    const response = await fetch(tasksUrl(filters));
    const payload = await readJson<TaskJson[]>(response, 'Failed to load tasks');
    return payload.map(taskFromJson);
}

export async function getTask(id: Task['id']): Promise<Task> {
    const response = await fetch(`${TASKS_URL}/${id}`);
    const payload = await readJson<TaskJson>(response, `Task ${id} not found`);
    return taskFromJson(payload);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
    const response = await fetch(TASKS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const payload = await readJson<TaskJson>(response, 'Failed to create task');
    return taskFromJson(payload);
}

export async function updateTask(task: Task): Promise<Task> {
    const response = await fetch(`${TASKS_URL}/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskToJson(task)),
    });
    const payload = await readJson<TaskJson>(response, `Task ${task.id} not found`);
    return taskFromJson(payload);
}

export async function deleteTask(id: Task['id']): Promise<void> {
    const response = await fetch(`${TASKS_URL}/${id}`, { method: 'DELETE' });
    if (!response.ok) {
        throw new Error(`Failed to delete task ${id}`);
    }
}
