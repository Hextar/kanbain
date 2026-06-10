import type { Habit } from '../types/Habit';

type StoredHabit = {
    id: string;
    name: string;
    completedMap: [string, boolean][];
};

export const HABITS_STORAGE_KEY = 'habits';

export function serializeHabits(habits: Habit[]): string {
    const stored: StoredHabit[] = habits.map(({ id, name, completedMap }) => ({
        id,
        name,
        completedMap: Array.from(completedMap.entries()),
    }));
    return JSON.stringify(stored);
}

export function deserializeHabits(value: string): Habit[] {
    const stored = JSON.parse(value) as StoredHabit[];
    return stored.map(({ id, name, completedMap }) => ({
        id,
        name,
        completedMap: new Map(completedMap),
    }));
}
