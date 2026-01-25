import type { Schedule, User } from '@shared/schema';

/**
 * Input for saving schedules - matches the saveSchedulesSchema
 */
export interface ScheduleInput {
  date: string;
  time: string;
  type?: string;
  location?: string;
  ministerId: string | null;
  position?: number;
  notes?: string;
}

/**
 * Schedule with joined user data
 */
export interface ScheduleWithMinister extends Schedule {
  minister?: User | null;
  ministerName?: string | null;
  scheduleDisplayName?: string | null;
}

/**
 * Schedule assignment for API responses
 */
export interface ScheduleAssignment {
  id: string;
  scheduleId: string;
  ministerId: string | null;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
  ministerName: string | null;
  scheduleDisplayName: string | null;
  photoUrl?: string | null;
  notes: string | null;
  status: string;
  type?: string;
  location?: string | null;
}

/**
 * Emergency save input schedule
 */
export interface EmergencySaveScheduleInput {
  date: string;
  time: string;
  type?: string;
  location?: string | null;
  ministerId?: string | null;
  position?: number;
  notes?: string | null;
}

/**
 * Result of a single schedule save operation
 */
export interface ScheduleSaveResult {
  success: boolean;
  id?: string;
  index: number;
}

/**
 * Error result from a schedule save operation
 */
export interface ScheduleSaveError {
  success: false;
  error: string;
  code?: string;
  detail?: string;
  constraint?: string;
  errorType?: string;
  fullError?: string;
  index: number;
  schedule: {
    date: string;
    time: string;
    ministerId?: string | null;
    position?: number;
  };
}

/**
 * WebSocket message data
 */
export interface WebSocketMessage {
  type: string;
  data?: unknown;
  timestamp?: string;
}

/**
 * WebSocket alert message
 */
export interface WebSocketAlert {
  type: 'alert';
  alertType: 'upcoming_mass' | 'critical_vacancy' | 'substitution_needed';
  data: {
    date: string;
    time: string;
    vacancies?: number;
    message: string;
  };
}

/**
 * WebSocket client data
 */
export interface WebSocketClient {
  userId: string;
  role: string;
  connectedAt: Date;
}

/**
 * Minister data for schedule generation
 */
export interface MinisterData {
  id: string;
  name: string;
  role: string;
  status: string;
  totalServices: number;
}

/**
 * Quality metrics for generated schedules
 */
export interface ScheduleQualityMetrics {
  uniqueMinistersUsed: number;
  averageMinistersPerMass: number;
  highConfidenceSchedules: number;
  lowConfidenceSchedules: number;
  balanceScore: number;
}

/**
 * Monthly schedule response data
 */
export interface MonthlyScheduleResponse {
  schedules: Array<{
    id: string;
    title: string;
    month: number;
    year: number;
    status: 'draft' | 'published' | 'completed';
    createdBy: string;
    createdAt: string;
    publishedAt?: string;
  }>;
  assignments: ScheduleAssignment[];
  substitutions: Array<{
    id: string;
    scheduleId: string;
    assignmentId: string;
    requesterId: string;
    requestingMinisterId: string;
    substituteId: string | null;
    status: string;
    reason: string | null;
  }>;
}

/**
 * Schedule joined with user data (from left join)
 */
export interface ScheduleWithUserJoin {
  schedules: Schedule;
  users: User | null;
}

/**
 * Substitution request joined with schedule
 */
export interface SubstitutionWithScheduleJoin {
  substitution_requests: {
    id: string;
    scheduleId: string;
    requesterId: string;
    substituteId: string | null;
    status: string;
    urgency: string;
    reason: string | null;
    approvedBy: string | null;
    approvedAt: Date | null;
    responseMessage: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  schedules: Schedule;
}

/**
 * Weekly grouped schedules
 */
export interface WeeklyGroupedSchedules {
  [weekKey: string]: {
    weekNumber: number;
    startDate: string;
    endDate: string;
    schedules: import('../utils/scheduleGenerator').GeneratedSchedule[];
  };
}

/**
 * Schedule validation diagnostics
 */
export interface ScheduleValidationDiagnostics {
  totalReceived: number;
  sample: ScheduleInput[];
  ministerIds: string[];
  uniqueDates: string[];
  uniqueTimes: string[];
  missingDate: number;
  missingTime: number;
  missingMinisterId: number;
  dataTypes: Record<string, string>;
  rawInput?: unknown;
  missingMinisterIds?: string[];
}

/**
 * Distribution balance metrics
 */
export interface DistributionMetrics {
  totalSchedules: number;
  uniqueMinisters: number;
  averageSchedulesPerMinister: number;
  distributionBalance: number;
  coverageByDay: Record<string, number>;
  substitutionRate: number;
  totalSubstitutions: number;
  completedSubstitutions: number;
}

/**
 * Helper type for extracting error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

/**
 * Helper type for extracting error stack
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}
