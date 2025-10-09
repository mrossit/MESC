import { parseISO, isSameDay } from 'date-fns';
import { ScheduleAssignment, SubstitutionRequest, Minister, SubstitutionStatus } from '../types';

/**
 * Gets assignments for a specific date
 */
export function getAssignmentsForDate(
  assignments: ScheduleAssignment[],
  date: Date
): ScheduleAssignment[] {
  return assignments.filter(a => {
    const assignmentDate = typeof a.date === 'string'
      ? parseISO(a.date.split('T')[0])
      : a.date;
    return isSameDay(assignmentDate, date);
  });
}

/**
 * Checks if user is scheduled on a specific date
 */
export function isUserScheduledOnDate(
  date: Date,
  userId: string | undefined,
  assignments: ScheduleAssignment[],
  substitutions: SubstitutionRequest[],
  ministers: Minister[]
): boolean {
  if (!userId) return false;

  const dayAssignments = getAssignmentsForDate(assignments, date);
  const currentMinister = ministers.find(m => m.id === userId);
  if (!currentMinister) return false;

  const isCurrentlyAssigned = dayAssignments.some(a => a.ministerId === currentMinister.id);

  const dayAssignmentIds = dayAssignments.map(a => a.id);
  const hasSubstitutionRequest = substitutions.some(s =>
    dayAssignmentIds.includes(s.assignmentId) &&
    s.requestingMinisterId === currentMinister.id
  );

  return isCurrentlyAssigned || hasSubstitutionRequest;
}

/**
 * Gets user's substitution status for a specific date
 */
export function getUserSubstitutionStatus(
  date: Date,
  userId: string | undefined,
  assignments: ScheduleAssignment[],
  substitutions: SubstitutionRequest[],
  ministers: Minister[]
): SubstitutionStatus {
  if (!userId) return null;

  const dayAssignments = getAssignmentsForDate(assignments, date);
  const currentMinister = ministers.find(m => m.id === userId);
  if (!currentMinister) return null;

  const dayAssignmentIds = dayAssignments.map(a => a.id);
  const userSubstitutionRequest = substitutions.find(s => {
    const hasAssignment = dayAssignmentIds.includes(s.assignmentId);
    const isRequester = s.requestingMinisterId === currentMinister.id;
    return hasAssignment && isRequester;
  });

  if (!userSubstitutionRequest) {
    const userAssignment = dayAssignments.find(a => a.ministerId === currentMinister.id);
    return userAssignment ? null : null;
  }

  if (userSubstitutionRequest.status === 'pending') {
    return 'pending';
  } else if (userSubstitutionRequest.status === 'approved' || userSubstitutionRequest.status === 'auto_approved') {
    return 'approved';
  }

  return null;
}

/**
 * Calculates assignment statistics for a day
 */
export function getDayAssignmentStats(assignments: ScheduleAssignment[]) {
  const totalAssigned = assignments.length;
  const confirmed = assignments.filter(a => a.ministerName !== 'VACANT').length;
  const toConfirm = assignments.filter(a => a.ministerName === 'VACANT').length;

  return { totalAssigned, confirmed, toConfirm };
}
