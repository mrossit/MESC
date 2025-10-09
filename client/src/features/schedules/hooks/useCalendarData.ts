import { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { CalendarDayData, ScheduleAssignment, SubstitutionRequest, Minister } from '../types';
import { getAssignmentsForDate, isUserScheduledOnDate, getUserSubstitutionStatus } from '../utils/calculations';
import { getMassTimesForDate } from '@shared/constants';

/**
 * Hook to compute calendar data with memoization for performance
 */
export function useCalendarData(
  currentMonth: Date,
  userId: string | undefined,
  assignments: ScheduleAssignment[],
  substitutions: SubstitutionRequest[],
  ministers: Minister[]
) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const calendarData = useMemo<CalendarDayData[]>(() => {
    return calendarDays.map(day => ({
      day,
      assignments: getAssignmentsForDate(assignments, day),
      isUserScheduled: isUserScheduledOnDate(day, userId, assignments, substitutions, ministers),
      substitutionStatus: getUserSubstitutionStatus(day, userId, assignments, substitutions, ministers),
      availableMassTimes: getMassTimesForDate(day)
    }));
  }, [calendarDays, userId, assignments, substitutions, ministers]);

  return { calendarDays, calendarData };
}
