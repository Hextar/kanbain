import { useContext } from "react";
import {
    HabitActionsContext,
    HabitStateContext,
    type HabitActionsContextType,
    type HabitStateContextType,
} from "./HabitProvider";

/** Subscribe to habits + counts. Re-renders when habits change. */
export function useHabitState(): HabitStateContextType {
    const context = useContext(HabitStateContext);
    if (!context) {
        throw new Error("useHabitState must be used within a HabitProvider");
    }
    return context;
}

/** Subscribe to actions only. Does not re-render when habits change. */
export function useHabitActions(): HabitActionsContextType {
    const context = useContext(HabitActionsContext);
    if (!context) {
        throw new Error("useHabitActions must be used within a HabitProvider");
    }
    return context;
}

/**
 * Convenience hook — subscribes to BOTH contexts.
 * Prefer useHabitState / useHabitActions so components only re-render when needed.
 */
export default function useHabits(): HabitStateContextType & HabitActionsContextType {
    return { ...useHabitState(), ...useHabitActions() };
}
