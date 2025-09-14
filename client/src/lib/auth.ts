import { apiRequest } from "./queryClient";
import { User } from "@shared/schema";

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

// Use the User type from schema but make it safer for frontend use
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "gestor" | "coordenador" | "ministro";
  status: "pending" | "active" | "inactive";
  requiresPasswordChange?: boolean;
  profilePhoto?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
}

// Auth API response types
export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

// Type guards for safe property access
export function isAuthResponse(data: unknown): data is AuthResponse {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.success === 'boolean';
}

export function isValidAuthUser(user: unknown): user is AuthUser {
  if (!user || typeof user !== 'object') return false;
  const u = user as Record<string, unknown>;
  return (
    typeof u.id === 'string' &&
    typeof u.email === 'string' &&
    typeof u.name === 'string' &&
    typeof u.role === 'string' &&
    ['gestor', 'coordenador', 'ministro'].includes(u.role as string) &&
    typeof u.status === 'string' &&
    ['pending', 'active', 'inactive'].includes(u.status as string)
  );
}

export function hasValidUser(response: unknown): response is AuthResponse & { user: AuthUser } {
  return isAuthResponse(response) && 
         response.success === true && 
         isValidAuthUser(response.user);
}

// Safe property accessor with fallbacks
export function safeGetUserProperty<K extends keyof AuthUser>(
  response: unknown, 
  property: K, 
  fallback: AuthUser[K]
): AuthUser[K] {
  if (hasValidUser(response)) {
    const value = response.user[property];
    return value !== undefined && value !== null ? value : fallback;
  }
  return fallback;
}

export const authAPI = {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser }> {
    try {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    } catch (error: any) {
      // Extrair mensagem do JSON se possível
      const errorMessage = error.message || "Erro ao fazer login";
      
      // Se o erro contém JSON, extrair a mensagem
      if (errorMessage.includes('"message":')) {
        try {
          const jsonStart = errorMessage.indexOf('{');
          if (jsonStart !== -1) {
            const jsonPart = errorMessage.substring(jsonStart);
            const parsedError = JSON.parse(jsonPart);
            if (parsedError.message) {
              throw new Error(parsedError.message);
            }
          }
        } catch (parseError) {
          // Se não conseguir fazer parse, usa a mensagem original
        }
      }
      
      throw error;
    }
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
