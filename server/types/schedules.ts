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
