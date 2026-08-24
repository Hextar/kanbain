import { delay, http, HttpResponse } from 'msw';
import type { Column, CreateColumnInput } from '../types/Column';
import { columns } from './mockDb';

const COLUMNS_URL = '/api/columns';

export const columnHandlers = [
    http.get(COLUMNS_URL, async () => {
        await delay(120);
        const sorted = [...columns].sort((left, right) => left.order - right.order);
        return HttpResponse.json(sorted);
    }),

    http.post(COLUMNS_URL, async ({ request }) => {
        await delay(120);
        const input = (await request.json()) as CreateColumnInput;
        const nextOrder = columns.reduce((max, column) => Math.max(max, column.order), -1) + 1;
        const column: Column = {
            id: input.id ?? crypto.randomUUID(),
            title: input.title,
            order: nextOrder,
        };
        columns.push(column);
        return HttpResponse.json(column, { status: 201 });
    }),
];
