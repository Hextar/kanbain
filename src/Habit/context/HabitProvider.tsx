import { createContext, useMemo, useRef } from "react";
import { useLocalStorage } from "usehooks-ts";
import getCompletionMapId from "../helpers/getCompletionMapId";
import { deserializeHabits, HABITS_STORAGE_KEY, serializeHabits } from "../helpers/habitStorage";
import type { Habit } from "../types/Habit";

type HabitProviderProps = {
    children: React.ReactNode;
}

export type { Habit };

export type HabitStateContextType = {
    habits: Habit[];
    habitsCount: number;
    todayCompletedHabitsCount: number;
};

export type HabitActionsContextType = {
    addHabit: (habit: Habit) => void;
    removeHabit: (id: string) => void;
    updateHabit: (key: string) => void;
};

// Re-renders when habits or derived counts change
export const HabitStateContext = createContext<HabitStateContextType | null>(null);

// Stable reference — consumers do not re-render when habits change
export const HabitActionsContext = createContext<HabitActionsContextType | null>(null);

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

    const stateValue = useMemo(
        () => ({ habits, habitsCount, todayCompletedHabitsCount }),
        [habits, habitsCount, todayCompletedHabitsCount],
    );

    // One object, created once — Provider value identity never changes.
    // Functions use setHabits(updater) so they always see the latest habits.
    const actionsRef = useRef<HabitActionsContextType>({
        addHabit(habit: Habit) {
            setHabits((currentHabits) => [...currentHabits, habit]);
        },
        removeHabit(id: string) {
            setHabits((currentHabits) => currentHabits.filter((habit) => habit.id !== id));
        },
        updateHabit(key: string) {
            setHabits((currentHabits) =>
                currentHabits.map((habit) => {
                    if (!key.startsWith(`${habit.id}-`)) return habit;

                    const newCompletedMap = new Map(habit.completedMap);
                    newCompletedMap.set(key, !(newCompletedMap.get(key) ?? false));
                    return { ...habit, completedMap: newCompletedMap };
                }),
            );
        },
    });

    return (
        <HabitActionsContext.Provider value={actionsRef.current}>
            <HabitStateContext.Provider value={stateValue}>
                {children}
            </HabitStateContext.Provider>
        </HabitActionsContext.Provider>
    );
}
