import Button from '@/uiKit/Button';
import { useHabitState } from './context/useHabits';
import useTimerange from './context/useTimerangeContext';

type HeaderProps = {
    className?: string;
}

export default function Header({ className }: HeaderProps) {
    const { habitsCount, todayCompletedHabitsCount } = useHabitState();
    const { formattedWeekRange, goToPreviousWeek, goToNextWeek, isCurrentWeek } = useTimerange();

    return <div className={`flex justify-between items-center p-4 ${className}`}>
        <div className="flex flex-col items-start gap-4">
            <h1 className="text-3xl font-bold text-white">Habit Tracker</h1>
            <span className="text-sm text-zinc-500">{todayCompletedHabitsCount} / {habitsCount} done today</span>
        </div>
        <div className="flex flex-col items-end gap-4">
            <div className="flex flex-col items-end">
                <span className="text-sm text-zinc-500">
                {formattedWeekRange}
                </span>
            </div>
            <div className="flex flex-row items-end gap-4">
                <Button onClick={goToPreviousWeek} kind="outline" aria-label="Previous">Prev</Button>
                <Button onClick={goToNextWeek} kind="filled" aria-label="Next" disabled={isCurrentWeek()}>Next</Button>
            </div>
        </div>
    </div>
}