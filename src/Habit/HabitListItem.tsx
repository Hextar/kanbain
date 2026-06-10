import { format, isToday, isAfter } from 'date-fns'
import RadioButton from '@/uiKit/RadioButton'
import Button from '@/uiKit/Button';
import { useHabitActions } from './context/useHabits';
import type { Habit } from './context/HabitProvider';
import getStreakCount from './helpers/getStreakCount';
import getCompletionMapId from './helpers/getCompletionMapId';
import useTimerange from './context/useTimerangeContext';

type HabitListItemProps = Habit

export default function HabitListItem({ id, name, completedMap: completedMap }: HabitListItemProps) {
    const { removeHabit } = useHabitActions();
    const { visibleDates } = useTimerange();
    const completedCount = getStreakCount(id, completedMap);

    return <div key={id} className="w-full flex flex-1 flex-col items-start gap-4 p-4 rounded-md bg-zinc-800">
        <div className="flex flex-row w-full justify-between gap-2">
            <div className="flex flex-row items-center gap-2">
                <span className="text-white text-xl">{name}</span>
                {completedCount > 0 && <span className="text-orange-500 text-md">🔥 {completedCount}</span>}
            </div>
            <div className="flex flex-row items-center gap-2">
                <Button variant="danger" size="xs" kind="outline" aria-label="Remove habit" onClick={() => removeHabit(id)}>Remove</Button>
            </div>
        </div>
        <div className="flex flex-row flex-wrap w-full items-center gap-4">
            {visibleDates.map((date) => {
                const dateId = getCompletionMapId(id, date);
                const isCompleted = completedMap?.get(dateId) ?? false;
                return HabitListItemDate({ id, date, completed: isCompleted })
            })}
        </div>
    </div>
}

function HabitListItemDate({ id, date, completed }: { id: string, date: Date, completed?: boolean }) {
    const { updateHabit } = useHabitActions();
    const shouldHighlight = isToday(date) && !completed;
    const isDisabled = isAfter(date, new Date());

    return (
        <RadioButton
            className="flex flex-1"
            key={date.toISOString()}
            selected={completed}
            disabled={isDisabled}
            kind={shouldHighlight ? "outline" : "filled"}
            aria-label={date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
            onClick={() => updateHabit(getCompletionMapId(id, date))}
        >
            <div className="flex flex-1 w-full flex-col items-center gap-1">
                <span className="flex flex-1 items-center text-xs">
                    {format(date, "d")}
                </span>
                <span className="flex flex-1 items-center text-xs">
                    {format(date, "eee")}
                </span>
            </div>
        </RadioButton>
    );
}