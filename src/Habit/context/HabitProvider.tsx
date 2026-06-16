import { createContext, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import getCompletionMapId from "../helpers/getCompletionMapId";
import { deserializeHabits, HABITS_STORAGE_KEY, serializeHabits } from "../helpers/habitStorage";
import type { Habit } from "../types/Habit";

type HabitProviderProps = {
    children: React.ReactNode;
}

export type { Habit };

type Context = {
    habits: Habit[];
    habitsCount: number;
    todayCompletedHabitsCount: number;
    addHabit: (habit: Habit) => void;
    removeHabit: (id: string) => void;
    updateHabit: (key: string) => void;
}

export const HabitContext = createContext<Context>({
    habits: [],
    habitsCount: 0,
    todayCompletedHabitsCount: 0,
    addHabit: () => {},
    removeHabit: () => {},
    updateHabit: () => {},
});

export function HabitProvider({ children }: HabitProviderProps) {
    const [habits, setHabits] = useLocalStorage<Habit[]>(HABITS_STORAGE_KEY, [], {
        serializer: serializeHabits,
        deserializer: deserializeHabits,
    });

    const habitsCount = useMemo(() => habits.length, [habits]);

    const todayCompletedHabitsCount = useMemo(() => {
        const today = new Date();
        return habits.filter((habit) => {
            const todayISO = getCompletionMapId(habit.id, today);
            return habit.completedMap.get(todayISO) ?? false;
        }).length;
    }, [habits]);

    const addHabit = (habit: Habit) => {
        setHabits((currentHabits) => [...currentHabits, habit]);
    }

    const removeHabit = (id: string) => {
        setHabits((currentHabits) => currentHabits.filter((habit) => habit.id !== id));
    }

    const updateHabit = (key: string) => {
        setHabits((currentHabits) => currentHabits.map((habit) => {
            if (!key.startsWith(`${habit.id}-`)) return habit;

            const newCompletedMap = new Map(habit.completedMap);
            newCompletedMap.set(key, !(newCompletedMap.get(key) ?? false));
            return {
                ...habit,
                completedMap: newCompletedMap,
            };
        }));
    }

    const contextValue = useMemo(
        () => ({ habits, habitsCount, todayCompletedHabitsCount, addHabit, removeHabit, updateHabit }),
        [habits, habitsCount, todayCompletedHabitsCount],
    );

    return (
        <HabitContext.Provider value={contextValue}>
            {children}
        </HabitContext.Provider>
    );
}
