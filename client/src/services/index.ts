// Exportar todos os serviços de forma centralizada
export { api } from './api';
export { authService } from './auth.service';
export { scheduleService } from './schedule.service';

// Re-exportar tipos úteis
export type { default as ApiService } from './api';