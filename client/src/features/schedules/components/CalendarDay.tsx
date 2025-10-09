import { format, isSameMonth, isSameDay } from 'date-fns';
import { Star, UserX, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarDayData, Schedule } from '../types';
import { CalendarDayStatus } from './CalendarDayStatus';
import { SUBSTITUTION_COLORS } from '../constants/massTypes';

interface CalendarDayProps {
  dayData: CalendarDayData;
  currentMonth: Date;
  selectedDate: Date;
  currentSchedule: Schedule | null;
  isCoordinator: boolean;
  onClick: (date: Date) => void;
}

export function CalendarDay({
  dayData,
  currentMonth,
  selectedDate,
  currentSchedule,
  isCoordinator,
  onClick
}: CalendarDayProps) {
  const { day, assignments, isUserScheduled, substitutionStatus, availableMassTimes } = dayData;

  const isToday = isSameDay(day, new Date());
  const isSelected = isSameDay(day, selectedDate);
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isPublished = currentSchedule?.status === 'published';
  const isDraft = currentSchedule?.status === 'draft';

  const getBorderColor = () => {
    if (!isUserScheduled || !isPublished) return '';
    if (substitutionStatus === 'pending') return SUBSTITUTION_COLORS.PENDING.color;
    if (substitutionStatus === 'approved') return SUBSTITUTION_COLORS.APPROVED.color;
    return SUBSTITUTION_COLORS.SCHEDULED.color;
  };

  const borderColor = getBorderColor();

  return (
    <div
      className={cn(
        'min-h-[60px] p-1 border rounded transition-all relative sm:min-h-24 sm:rounded-lg sm:p-2',
        isToday && !isUserScheduled && 'border-primary border-2',
        isSelected && !isUserScheduled && 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600',
        isUserScheduled && isPublished && 'bg-white dark:bg-slate-900 border-2 shadow-lg ring-2 ring-offset-1',
        !isCurrentMonth && 'opacity-50',
        isPublished && isCurrentMonth && !isUserScheduled && 'cursor-pointer hover:bg-accent hover:shadow-lg hover:scale-105',
        isUserScheduled && isPublished && isCurrentMonth && 'cursor-pointer hover:scale-110 hover:shadow-xl hover:ring-4',
        isCoordinator && isDraft && isCurrentMonth && 'cursor-pointer hover:bg-accent'
      )}
      style={
        isUserScheduled && isPublished
          ? {
              borderColor,
              ['--tw-ring-color' as any]: borderColor
            }
          : undefined
      }
      onClick={() => onClick(day)}
    >
      {/* Badge when user is scheduled */}
      {isUserScheduled && isPublished && (
        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 z-10">
          <div className="relative">
            {!substitutionStatus && (
              <>
                <div
                  className="absolute inset-0 rounded-full blur-lg opacity-60 animate-pulse"
                  style={{ backgroundColor: SUBSTITUTION_COLORS.SCHEDULED.color }}
                />
                <Star
                  className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse relative"
                  style={{ color: SUBSTITUTION_COLORS.SCHEDULED.color, fill: SUBSTITUTION_COLORS.SCHEDULED.color }}
                />
              </>
            )}
            {substitutionStatus === 'pending' && (
              <>
                <div
                  className="absolute inset-0 rounded-full blur-lg opacity-60 animate-pulse"
                  style={{ backgroundColor: SUBSTITUTION_COLORS.PENDING.color }}
                />
                <UserX
                  className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse relative"
                  style={{ color: SUBSTITUTION_COLORS.PENDING.color, fill: SUBSTITUTION_COLORS.PENDING.color }}
                />
              </>
            )}
            {substitutionStatus === 'approved' && (
              <>
                <div
                  className="absolute inset-0 rounded-full blur-lg opacity-60 animate-pulse"
                  style={{ backgroundColor: SUBSTITUTION_COLORS.APPROVED.color }}
                />
                <Check
                  className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse relative"
                  style={{ color: SUBSTITUTION_COLORS.APPROVED.color, fill: SUBSTITUTION_COLORS.APPROVED.color }}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Day number */}
      <div className="font-semibold text-xs mb-0.5 sm:text-sm sm:mb-1 flex items-center justify-between">
        <span
          className={cn(
            'transition-all',
            isUserScheduled && isPublished && 'font-bold text-lg'
          )}
          style={isUserScheduled && isPublished ? { color: borderColor } : undefined}
        >
          {format(day, 'd')}
        </span>
      </div>

      {/* Status indicators */}
      {isPublished && isCurrentMonth && (
        <>
          {/* Mobile */}
          <div className="sm:hidden">
            <CalendarDayStatus
              isUserScheduled={isUserScheduled}
              substitutionStatus={substitutionStatus}
              assignments={assignments}
              availableMassTimes={availableMassTimes}
              isMobile
            />
          </div>

          {/* Desktop */}
          <div className="hidden sm:block space-y-0.5">
            <CalendarDayStatus
              isUserScheduled={isUserScheduled}
              substitutionStatus={substitutionStatus}
              assignments={assignments}
              availableMassTimes={availableMassTimes}
              isMobile={false}
            />
          </div>
        </>
      )}
    </div>
  );
}
