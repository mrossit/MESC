import { api } from './api';
import { User, ApiResponse } from '@/types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const response = await api.post<LoginResponse>('/api/auth/login', credentials);

    if (response.success && response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response;
  }

  async register(data: RegisterData): Promise<ApiResponse<User>> {
    return api.post<User>('/api/auth/register', data);
  }

  async logout(): Promise<void> {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return api.get<User>('/api/auth/me');
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return api.post('/api/auth/change-password', {
      oldPassword,
      newPassword
    });
  }

  async resetPassword(email: string): Promise<ApiResponse<void>> {
    return api.post('/api/auth/reset-password', { email });
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}

export const authService = new AuthService();