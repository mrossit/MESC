export interface Schedule {
  id: string;
  title: string;
  month: number;
  year: number;
  status: "draft" | "published" | "completed";
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
}

export interface ScheduleAssignment {
  id: string;
  scheduleId: string;
  ministerId: string;
  ministerName?: string;
  scheduleDisplayName?: string;
  date: string;
  massTime: string;
  position: number;
  confirmed: boolean;
  notes?: string;
}

export interface SubstitutionRequest {
  id: string;
  assignmentId: string;
  requestingMinisterId: string;
  substituteMinisterId: string | null;
  status: "pending" | "approved" | "auto_approved";
  reason: string;
}

export interface Minister {
  id: string;
  name: string;
  active: boolean;
  photoUrl?: string;
  preferredPosition?: number;
}

export type SubstitutionStatus = 'pending' | 'approved' | null;

export type ExportFormat = 'excel' | 'pdf' | 'html';

export interface MassTypeInfo {
  type: string;
  color: string;
  textColor: string;
}

export interface DayStatusConfig {
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  textColor?: string;
}

export interface CalendarDayData {
  day: Date;
  assignments: ScheduleAssignment[];
  isUserScheduled: boolean;
  substitutionStatus: SubstitutionStatus;
  availableMassTimes: string[];
}
