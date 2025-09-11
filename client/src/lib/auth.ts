import { apiRequest } from "./queryClient";

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone?: string;
  role: "ministro";
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "gestor" | "coordenador" | "ministro";
  status: "pending" | "active" | "inactive";
  requiresPasswordChange?: boolean;
  profilePhoto?: string;
}

export const authAPI = {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser }> {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    return response.json();
  },

  async register(data: RegisterData): Promise<{ message: string }> {
    const response = await apiRequest("POST", "/api/auth/register", data);
    return response.json();
  },

  async logout(): Promise<{ message: string }> {
    const response = await apiRequest("POST", "/api/auth/logout");
    return response.json();
  },

  async getMe(): Promise<{ user: AuthUser }> {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
};
