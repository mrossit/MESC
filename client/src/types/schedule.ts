export interface Minister {
  id: string;
  name: string;
  role: string;
  totalServices: number;
  availabilityScore: number;
  position?: number;
}

export interface GeneratedSchedule {
  date: string;
  time: string;
  dayOfWeek: number;
  ministers: Minister[];
  backupMinisters: Minister[];
  confidence: number;
  qualityScore: string;
}

export interface QualityMetrics {
  uniqueMinistersUsed: number;
  averageMinistersPerMass: number;
  highConfidenceSchedules: number;
  lowConfidenceSchedules: number;
  balanceScore: number;
}

export interface GenerationData {
  month: number;
  year: number;
  totalSchedules: number;
  averageConfidence: number;
  qualityMetrics: QualityMetrics;
  schedules: GeneratedSchedule[];
  schedulesByWeek: { [key: string]: GeneratedSchedule[] };
}

export interface GenerationResponse {
  success: boolean;
  message: string;
  data: GenerationData;
}

export interface TestResult {
  month: number;
  year: number;
  mockData: {
    ministerCount: number;
  };
  statistics: {
    totalMasses: number;
    coverage: number;
    averageConfidence: number;
    fairnessScore: number;
    uniqueMinistersUsed: number;
    totalMinistersAvailable: number;
    utilizationRate: number;
    averageAssignmentsPerMinister: number;
    distributionVariance: number;
    highConfidenceSchedules: number;
    mediumConfidenceSchedules: number;
    lowConfidenceSchedules: number;
    incompleteSchedules: number;
    outliers: Array<{
      ministerName: string;
      count: number;
      reason: string;
    }>;
  };
  schedules: Array<{
    date: string;
    time: string;
    ministersRequired: number;
    ministersAssigned: number;
    ministers: Minister[];
  }>;
}

export interface EditingSchedule {
  date: string;
  time: string;
  ministers: Array<{
    id: string;
    name: string;
  }>;
}
