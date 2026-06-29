import { apiRequest, queryClient } from "./queryClient";
import { clearLocalSession, markSkipAutoBiometricOnce } from "./persistent-storage";
import { clearNativeBiometricSavedCredential } from "./native-biometric-auth";
import {
  mobileGetMe,
  mobileLogin,
  mobileLogout,
  shouldUseMobileAuth,
} from "./mobile-auth-session";
import type {
  MobileAuthResponse,
  MobileCommunity,
  MobileMeResponse,
  MobileUser,
} from "@shared/mobileClient";

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
  role: "gestor" | "reitor" | "coordenador" | "coordenador_comunidade" | "coordenador_paroquial" | "ministro";
  status: "pending" | "active" | "inactive" | "deleted";
  /** Comunidade-casa do usuário (multi-comunidade). Usado a partir da Fase 3. */
  homeCommunityId?: string;
  requiresPasswordChange?: boolean;
  profilePhoto?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  /**
   * Acesso a funcionalidades em rollout (ex: import/export xlsx).
   * Origem: ADMIN_USER_IDS em server/config/admins.ts.
   */
  isAdmin?: boolean;
}

// Auth API response types
export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  communities?: MobileCommunity[];
  activeCommunityId?: string;
  message?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  sessionToken?: string | null;
  user?: AuthUser;
  communities?: MobileCommunity[];
  activeCommunityId?: string;
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
    ['gestor', 'reitor', 'coordenador', 'coordenador_comunidade', 'coordenador_paroquial', 'ministro'].includes(u.role as string) &&
    typeof u.status === 'string' &&
    ['pending', 'active', 'inactive', 'deleted'].includes(u.status as string)
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

const AUTH_ROLES: AuthUser["role"][] = [
  "gestor",
  "reitor",
  "coordenador",
  "coordenador_comunidade",
  "coordenador_paroquial",
  "ministro",
];

function toAuthRole(role: string): AuthUser["role"] {
  return AUTH_ROLES.includes(role as AuthUser["role"])
    ? role as AuthUser["role"]
    : "ministro";
}

function mobileUserToAuthUser(user: MobileUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: toAuthRole(user.role),
    status: "active",
    homeCommunityId: user.homeCommunityId,
    requiresPasswordChange: user.requiresPasswordChange,
    photoUrl: user.photoUrl,
    profilePhoto: user.photoUrl ?? undefined,
  };
}

function mobileLoginToAuthResponse(response: MobileAuthResponse): LoginResponse & { user: AuthUser } {
  return {
    success: true,
    token: response.auth.accessToken,
    sessionToken: response.auth.sessionToken,
    user: mobileUserToAuthUser(response.user),
    communities: response.communities,
    activeCommunityId: response.activeCommunityId,
  };
}

function mobileMeToAuthResponse(response: MobileMeResponse): AuthResponse & { user: AuthUser } {
  return {
    success: true,
    user: mobileUserToAuthUser(response.user),
    communities: response.communities,
    activeCommunityId: response.activeCommunityId,
  };
}

export const authAPI = {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser }> {
    try {
      if (shouldUseMobileAuth()) {
        return mobileLoginToAuthResponse(await mobileLogin({
          email: credentials.email,
          password: credentials.password,
          keepSignedIn: credentials.rememberMe ?? false,
        }));
      }

      const response = await apiRequest("POST", "/api/auth/login", credentials);
      const data = await response.json();

      // 🔑 IMPORTANTE: Salvar o token JWT no localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('auth_token', data.token); // Compatibilidade com monitor
      }

      // 🔒 NOVO: Salvar session_token para controle de inatividade (10min)
      if (data.sessionToken) {
        localStorage.setItem('session_token', data.sessionToken);
      }

      return data;
    } catch (error) {
      // Extrair mensagem do JSON se possível
      const errorMessage = error instanceof Error ? error.message : "Erro ao fazer login";
      
      // Se o erro contém JSON no formato "status: {json}", extrair a mensagem
      if (errorMessage.includes('{"success":false,"message":')) {
        try {
          // Encontrar o início do JSON
          const jsonStart = errorMessage.indexOf('{"success":false');
          if (jsonStart !== -1) {
            const jsonPart = errorMessage.substring(jsonStart);
            const parsedError = JSON.parse(jsonPart);
            if (parsedError.message) {
              throw new Error(parsedError.message);
            }
          }
        } catch (parseError) {
          // Se não conseguir fazer parse, usar mensagem padrão
          throw new Error('Usuário ou senha errados, revise os dados e tente novamente.');
        }
      }
      
      // Se não contém JSON válido, usar mensagem padrão
      throw new Error('Usuário ou senha errados, revise os dados e tente novamente.');
    }
  },

  async register(data: RegisterData): Promise<{ message: string }> {
    const response = await apiRequest("POST", "/api/auth/register", data);
    return response.json();
  },

  async logout(): Promise<{ message: string }> {
    let result: { message: string } = { message: "Logout realizado com sucesso" };

    try {
      if (shouldUseMobileAuth()) {
        await mobileLogout();
      } else {
        const response = await apiRequest("POST", "/api/auth/logout");
        result = await response.json();
      }
    } catch {
      // Mesmo offline ou com sessao expirada, sair deve sempre limpar a sessao local.
    } finally {
      await clearNativeBiometricSavedCredential().catch(() => undefined);
      clearLocalSession();
      markSkipAutoBiometricOnce();
      queryClient.clear();
    }

    return result;
  },

  async getMe(): Promise<{ user: AuthUser }> {
    try {
      if (shouldUseMobileAuth()) {
        return mobileMeToAuthResponse(await mobileGetMe());
      }

      const response = await apiRequest("GET", "/api/auth/me");
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
};
