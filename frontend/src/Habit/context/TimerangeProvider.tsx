import React, { createContext, useMemo, useState, useCallback } from "react";
import { startOfWeek, endOfWeek, addWeeks, format, eachDayOfInterval } from "date-fns";

type TimerangeContextType = {
  startOfWeek: Date;
  endOfWeek: Date;
  visibleDates: Date[];
  formattedWeekRange: string;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  isCurrentWeek: () => boolean;
};

export const TimerangeContext = createContext<TimerangeContextType | undefined>(undefined);

export default function TimerangeProvider({ children }: { children: React.ReactNode }) {
  // "today" is fixed for a given mount of the provider
  const today = useMemo(() => new Date(), []);

  // The week offset relative to today (0 = current week, -1 = last week, etc.)
  const [weekOffset, setWeekOffset] = useState(0);

  // Calculate the start and end of the week based on the offset
  const weekDates = useMemo(() => {
    const refDate = addWeeks(today, weekOffset);
    return {
      startOfWeek: startOfWeek(refDate, { weekStartsOn: 1 }),
      endOfWeek: endOfWeek(refDate, { weekStartsOn: 1 }),
    };
  }, [today, weekOffset]);

  const visibleDates = useMemo(() => {
    return eachDayOfInterval({
      start: weekDates.startOfWeek,
      end: weekDates.endOfWeek,
    });
  }, [weekDates]);

  // Go to the previous week
  const goToPreviousWeek = useCallback(() => {
    setWeekOffset(offset => offset - 1);
  }, []);

  // Go to the next week (but not beyond the current week)
  const goToNextWeek = useCallback(() => {
    setWeekOffset(offset => Math.min(offset + 1, 0));
  }, []);

  // Check if this is the current week (weekOffset === 0)
  const isCurrentWeek = useCallback(() => weekOffset === 0, [weekOffset]);

  const formattedWeekRange = useMemo(() => {
    return `${format(weekDates.startOfWeek, 'MMM d')} - ${format(weekDates.endOfWeek, 'MMM d')}`;
  }, [weekDates]);

  return (
    <TimerangeContext.Provider
      value={{
        startOfWeek: weekDates.startOfWeek,
        endOfWeek: weekDates.endOfWeek,
        visibleDates,
        formattedWeekRange,
        goToPreviousWeek,
        goToNextWeek,
        isCurrentWeek,
      }}
    >
      {children}
    </TimerangeContext.Provider>
  );
}