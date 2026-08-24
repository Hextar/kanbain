import { delay, http, HttpResponse } from 'msw';
import { columns, tasks } from './mockDb';
import type { CreateTaskInput, Task, TaskListFilters } from '../types/Task';
import { taskFromJson, taskToJson, type TaskJson } from '../helpers/taskJson';

const TASKS_URL = '/api/tasks';

function matchesFilters(task: Task, filters: TaskListFilters) {
    if (filters.columnId !== undefined && task.columnId !== filters.columnId) return false;
    if (filters.category !== undefined && task.category !== filters.category) return false;
    if (filters.priority !== undefined && task.priority !== filters.priority) return false;
    return true;
}

function filtersFromUrl(url: URL): TaskListFilters {
    const columnId = url.searchParams.get('columnId');
    const category = url.searchParams.get('category');
    const priority = url.searchParams.get('priority');

    return {
        columnId: columnId ?? undefined,
        category: category ?? undefined,
        priority: priority === 'low' || priority === 'medium' || priority === 'high'
            ? priority
            : undefined,
    };
}

export const taskHandlers = [
    http.get(TASKS_URL, async ({ request }) => {
        await delay(120);
        const filtered = tasks.filter((task) => matchesFilters(task, filtersFromUrl(new URL(request.url))));
        return HttpResponse.json(filtered.map(taskToJson));
    }),

    http.get(`${TASKS_URL}/:id`, async ({ params }) => {
        await delay(120);
        const id = String(params.id);
        const task = tasks.find((current) => current.id === id);
        if (!task) {
            return HttpResponse.json({ message: `Task ${id} not found` }, { status: 404 });
        }
        return HttpResponse.json(taskToJson(task));
    }),

    http.post(TASKS_URL, async ({ request }) => {
        await delay(120);
        const input = (await request.json()) as CreateTaskInput;
        if (!columns.some((column) => column.id === input.columnId)) {
            return HttpResponse.json({ message: 'Unknown column' }, { status: 400 });
        }

        const task: Task = {
            ...input,
            id: input.id ?? crypto.randomUUID(),
            createdAt: new Date(),
        };
        tasks.push(task);
        return HttpResponse.json(taskToJson(task), { status: 201 });
    }),

    http.put(`${TASKS_URL}/:id`, async ({ params, request }) => {
        await delay(120);
        const id = String(params.id);
        const payload = (await request.json()) as TaskJson;
        const index = tasks.findIndex((current) => current.id === id);
        if (index === -1) {
            return HttpResponse.json({ message: `Task ${id} not found` }, { status: 404 });
        }

        const nextTask = taskFromJson({ ...payload, id });
        tasks[index] = nextTask;
        return HttpResponse.json(taskToJson(nextTask));
    }),

    http.delete(`${TASKS_URL}/:id`, async ({ params }) => {
        await delay(120);
        const id = String(params.id);
        const index = tasks.findIndex((task) => task.id === id);
        if (index !== -1) tasks.splice(index, 1);
        return new HttpResponse(null, { status: 204 });
    }),
];
