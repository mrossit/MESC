import { isAdmin as isAdminRole } from "@shared/roles";

type ScheduleAuthorizationAssignment = {
  ministerId: string | null;
  position: number | null;
};

export function isAuxiliarOneOrTwoForMass(
  userId: string | undefined,
  assignments: ScheduleAuthorizationAssignment[],
) {
  if (!userId) {
    return false;
  }

  return assignments.some((assignment) =>
    assignment.ministerId === userId &&
    (assignment.position === 1 || assignment.position === 2)
  );
}

export function canRearrangeMassSchedule(input: {
  role: string | undefined;
  userId: string | undefined;
  assignments: ScheduleAuthorizationAssignment[];
}) {
  if (isAdminRole(input.role)) {
    return true;
  }

  return isAuxiliarOneOrTwoForMass(input.userId, input.assignments);
}

/**
 * Esvaziar a missa (lista vazia) APAGA a missa do calendário — ação destrutiva
 * reservada à coordenação. Auxiliar 1/2 pode reorganizar, mas nunca remover a missa.
 */
export function canDeleteEntireMass(role: string | undefined) {
  return isAdminRole(role);
}
