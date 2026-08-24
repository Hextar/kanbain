import type { Column, CreateColumnInput } from '../types/Column';

const COLUMNS_URL = '/api/columns';

async function readJson<T>(response: Response, errorMessage: string): Promise<T> {
    if (!response.ok) {
        throw new Error(errorMessage);
    }
    return response.json() as Promise<T>;
}

export async function getColumns(): Promise<Column[]> {
    const response = await fetch(COLUMNS_URL);
    return readJson<Column[]>(response, 'Failed to load columns');
}

export async function createColumn(input: CreateColumnInput): Promise<Column> {
    const response = await fetch(COLUMNS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return readJson<Column>(response, 'Failed to create column');
}
