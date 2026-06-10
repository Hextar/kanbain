import { isSameDay, parseISO } from 'date-fns';
import getCompletionMapId from './getCompletionMapId';

export default function getStreakCount(id: string, completedMap: Map<string, boolean>): number {
    const today = new Date();
    const todayKey = getCompletionMapId(id, today);

    if (completedMap.get(todayKey) !== true) {
        return 0;
    }

    const completedDates: Date[] = [];
    const prefix = `${id}-`;

    completedMap.forEach((completed, key) => {
        if (!completed) return;
        if (key.startsWith(prefix)) {
            const dateStr = key.slice(prefix.length);
            const parsedDate = parseISO(dateStr);
            if (!isNaN(parsedDate.getTime())) {
                completedDates.push(parsedDate);
            }
        }
    });

    const uniqueCompletedDates = Array.from(
        new Map(completedDates.map(d => [d.toISOString().split('T')[0], d])).values()
    ).sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    let streakDate = today;

    while (true) {
        const match = uniqueCompletedDates.find(d => isSameDay(d, streakDate));
        if (match) {
            streak++;
            streakDate = new Date(streakDate);
            streakDate.setDate(streakDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}
