// Re-exportar tipos existentes
export * from '@/lib/types';

// Tipos de usuário
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'gestor' | 'reitor' | 'coordenador' | 'coordenador_comunidade' | 'coordenador_paroquial' | 'ministro';
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
export interface QuestionnaireResponseItem {
  questionId: string;
  answer: string | string[] | boolean | Record<string, unknown>;
}

export interface QuestionnaireResponse {
  id: string;
  userId: string;
  questionnaireId: string;
  responses: QuestionnaireResponseItem[];
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

// Tipos de erro da API
export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

// Tipos de API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ApiError[];
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

// Tipos de validação de formulário
export interface FormValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  message?: string;
}

// Tipos de formulário
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date' | 'time';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: FormValidation;
}