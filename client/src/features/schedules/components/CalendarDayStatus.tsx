import { Users, AlertCircle, Star, UserX, Check } from 'lucide-react';
import { SubstitutionStatus, ScheduleAssignment } from '../types';
import { getDayAssignmentStats } from '../utils/calculations';
import { SUBSTITUTION_COLORS } from '../constants/massTypes';

interface CalendarDayStatusProps {
  isUserScheduled: boolean;
  substitutionStatus: SubstitutionStatus;
  assignments: ScheduleAssignment[];
  availableMassTimes: string[];
  isMobile?: boolean;
}

export function CalendarDayStatus({
  isUserScheduled,
  substitutionStatus,
  assignments,
  availableMassTimes,
  isMobile = false
}: CalendarDayStatusProps) {
  if (isUserScheduled) {
    return <UserScheduledIndicator substitutionStatus={substitutionStatus} isMobile={isMobile} />;
  }

  if (assignments.length > 0) {
    return <AssignmentsIndicator assignments={assignments} isMobile={isMobile} />;
  }

  if (availableMassTimes.length > 0) {
    return <VacantIndicator isMobile={isMobile} />;
  }

  return null;
}

function UserScheduledIndicator({ substitutionStatus, isMobile }: { substitutionStatus: SubstitutionStatus; isMobile: boolean }) {
  if (substitutionStatus === 'pending') {
    return (
      <div className="flex items-center gap-1">
        <UserX
          className={isMobile ? 'h-4 w-4' : 'h-4 w-4 flex-shrink-0'}
          style={{ color: SUBSTITUTION_COLORS.PENDING.color, fill: SUBSTITUTION_COLORS.PENDING.color }}
        />
        {!isMobile && (
          <span className="text-[10px] font-bold truncate" style={{ color: SUBSTITUTION_COLORS.PENDING.color }}>
            {SUBSTITUTION_COLORS.PENDING.label}
          </span>
        )}
      </div>
    );
  }

  if (substitutionStatus === 'approved') {
    return (
      <div className="flex items-center gap-1">
        <Check
          className={isMobile ? 'h-4 w-4' : 'h-4 w-4 flex-shrink-0'}
          style={{ color: SUBSTITUTION_COLORS.APPROVED.color, fill: SUBSTITUTION_COLORS.APPROVED.color }}
        />
        {!isMobile && (
          <span className="text-[10px] font-bold truncate" style={{ color: SUBSTITUTION_COLORS.APPROVED.color }}>
            {SUBSTITUTION_COLORS.APPROVED.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Star
        className={isMobile ? 'h-4 w-4 animate-pulse' : 'h-4 w-4 animate-pulse flex-shrink-0'}
        style={{ color: SUBSTITUTION_COLORS.SCHEDULED.color, fill: SUBSTITUTION_COLORS.SCHEDULED.color }}
      />
      {!isMobile && (
        <span className="text-[10px] font-bold truncate" style={{ color: SUBSTITUTION_COLORS.SCHEDULED.color }}>
          {SUBSTITUTION_COLORS.SCHEDULED.label}
        </span>
      )}
    </div>
  );
}

function AssignmentsIndicator({ assignments, isMobile }: { assignments: ScheduleAssignment[]; isMobile: boolean }) {
  const { totalAssigned, toConfirm } = getDayAssignmentStats(assignments);

  if (isMobile) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-0.5">
          <Users className="h-3 w-3 text-primary" />
          <span className="text-[9px] font-medium text-primary">{totalAssigned}</span>
        </div>
        {toConfirm > 0 && (
          <div className="flex items-center gap-0.5">
            <AlertCircle className="h-3 w-3" style={{ color: SUBSTITUTION_COLORS.VACANT.color }} />
            <span className="text-[9px] font-medium" style={{ color: SUBSTITUTION_COLORS.VACANT.color }}>
              {toConfirm}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-primary">
        <Users className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-[10px] font-medium truncate">{totalAssigned} escalados</span>
      </div>
      {toConfirm > 0 && (
        <div className="flex items-center gap-1" style={{ color: SUBSTITUTION_COLORS.VACANT.color }}>
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-[10px] font-medium truncate">{toConfirm} à confirmar</span>
        </div>
      )}
    </div>
  );
}

function VacantIndicator({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="flex items-center justify-center">
        <AlertCircle className="h-3.5 w-3.5" style={{ color: SUBSTITUTION_COLORS.VACANT.color }} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" style={{ color: SUBSTITUTION_COLORS.VACANT.color }}>
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="text-[10px] font-medium truncate">Vagas</span>
    </div>
  );
}
