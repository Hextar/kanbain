import type { Column } from '../types/Column';
import type { Task } from '../types/Task';

export const columns: Column[] = [
    { id: crypto.randomUUID(), title: 'To Do', order: 0 },
    { id: crypto.randomUUID(), title: 'In Progress', order: 1 },
    { id: crypto.randomUUID(), title: 'Done', order: 2 },
];

export const tasks: Task[] = [];
