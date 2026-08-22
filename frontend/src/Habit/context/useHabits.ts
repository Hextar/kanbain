import { useContext } from "react";
import {
    HabitActionsContext,
    HabitStateContext,
    type HabitActionsContextType,
    type HabitStateContextType,
} from "./HabitProvider";

export function useHabitState(): HabitStateContextType {
    const context = useContext(HabitStateContext);
    if (!context) {
        throw new Error("useHabitState must be used within a HabitProvider");
    }
    return context;
}

export function useHabitActions(): HabitActionsContextType {
    const context = useContext(HabitActionsContext);
    if (!context) {
        throw new Error("useHabitActions must be used within a HabitProvider");
    }
    return context;
}

export default function useHabits(): HabitStateContextType & HabitActionsContextType {
    return { ...useHabitState(), ...useHabitActions() };
}
