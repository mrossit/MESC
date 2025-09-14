// Re-exportar tipos existentes
export * from '@/lib/types';

// Tipos de usuário
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'gestor' | 'coordenador' | 'ministro';
  status: 'pending' | 'active' | 'inactive';
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  requiresPasswordChange?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Tipos de escala
export interface Schedule {
  id: string;
  date: string;
  time: string;
  ministerId: string;
  ministerName?: string;
  type: 'sunday' | 'weekday' | 'special';
  location?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tipos de questionário
export interface QuestionnaireResponse {
  id: string;
  userId: string;
  questionnaireId: string;
  responses: any[];
  submittedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tipos de notificação
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'announcement';
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

// Tipos de formação
export interface FormationModule {
  id: string;
  title: string;
  description: string;
  content: string;
  track: 'basic' | 'advanced' | 'specialized';
  order: number;
  duration?: number;
  requiredModules?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FormationProgress {
  userId: string;
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
  score?: number;
}

// Tipos de API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: any[];
}

// Tipos de filtros e paginação
export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  role?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Tipos de formulário
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date' | 'time';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: any;
}