import { api } from './api';
import { Schedule, ApiResponse } from '@/types';

interface CreateScheduleData {
  date: string;
  time: string;
  ministerId: string;
  type: 'sunday' | 'weekday' | 'special';
  location?: string;
  notes?: string;
}

interface ScheduleFilters {
  dateFrom?: string;
  dateTo?: string;
  ministerId?: string;
  type?: string;
}

class ScheduleService {
  async getSchedules(filters?: ScheduleFilters): Promise<ApiResponse<Schedule[]>> {
    return api.get<Schedule[]>('/api/schedules', { params: filters });
  }

  async getScheduleById(id: string): Promise<ApiResponse<Schedule>> {
    return api.get<Schedule>(`/api/schedules/${id}`);
  }

  async createSchedule(data: CreateScheduleData): Promise<ApiResponse<Schedule>> {
    return api.post<Schedule>('/api/schedules', data);
  }

  async updateSchedule(id: string, data: Partial<CreateScheduleData>): Promise<ApiResponse<Schedule>> {
    return api.put<Schedule>(`/api/schedules/${id}`, data);
  }

  async deleteSchedule(id: string): Promise<ApiResponse<void>> {
    return api.delete(`/api/schedules/${id}`);
  }

  async getMySchedules(month?: number, year?: number): Promise<ApiResponse<Schedule[]>> {
    const params = month && year ? { month, year } : undefined;
    return api.get<Schedule[]>('/api/schedules/my', { params });
  }

  async generateSchedules(month: number, year: number): Promise<ApiResponse<Schedule[]>> {
    return api.post<Schedule[]>('/api/schedules/generate', { month, year });
  }

  async swapSchedules(scheduleId1: string, scheduleId2: string): Promise<ApiResponse<void>> {
    return api.post('/api/schedules/swap', {
      scheduleId1,
      scheduleId2
    });
  }

  async requestSubstitute(scheduleId: string, reason: string): Promise<ApiResponse<void>> {
    return api.post(`/api/schedules/${scheduleId}/substitute`, { reason });
  }
}

export const scheduleService = new ScheduleService();