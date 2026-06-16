import { useHabitState } from "./context/useHabits";
import HabitListItem from "./HabitListItem";


type HabitListProps = {
    className?: string;
}

export default function HabitList({ className }: HabitListProps) {
    const { habits } = useHabitState();
    
    if (habits.length === 0) {
        return <EmptyHabitList className={className} />
    }

    return (
        <div className={`flex flex-col items-start gap-4 p-4 pt-0 ${className}`}>
            {habits.map((habit) => (
                <HabitListItem key={habit.id} {...habit} />
            ))}
        </div>
    )
}

function EmptyHabitList({ className }: { className?: string }) {
    return <div className={`flex flex-col items-center justify-center gap-4 p-4 ${className}`}>
        <h2 className="text-md font-bold text-zinc-500">No habits found</h2>
    </div>
}
