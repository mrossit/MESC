export interface User {
  id: string;
  email: string;
  name: string;
  role: "gestor" | "coordenador" | "ministro";
  status: "pending" | "active" | "inactive";
  requiresPasswordChange?: boolean;
  profilePhoto?: string;
}

export interface AuthUser extends User {
  profilePhoto?: string;
}

export interface Minister {
  id: string;
  userId: string;
  birthDate?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  preferredTimes: string[];
  experience: string;
  specialSkills: string[];
  lastService?: string;
  totalServices: number;
  formationCompleted: string[];
  createdAt: string;
  user?: User;
}

export interface DashboardStats {
  totalMinisters: number;
  responseRate: number;
  pendingSchedules: number;
  pendingApprovals: number;
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  description: string;
  metadata?: any;
  createdAt: string;
}
