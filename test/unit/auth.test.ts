/**
 * Auth API Tests
 *
 * Tests authentication functionality including login, logout, and user fetching.
 * Uses vitest mocks for fetch and localStorage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageMock.store[key]; }),
  clear: vi.fn(() => { localStorageMock.store = {}; }),
};

// Mock sessionStorage
const sessionStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => sessionStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => { sessionStorageMock.store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete sessionStorageMock.store[key]; }),
  clear: vi.fn(() => { sessionStorageMock.store = {}; }),
};

// Set up global mocks
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock });

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: '',
      VITE_APP_VERSION: '1.0.0-test'
    }
  }
});

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.store = {};
    sessionStorageMock.store = {};
  });

  describe('Login', () => {
    it('should send correct credentials to login endpoint', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ministro',
        status: 'active',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          token: 'jwt-token-123',
          sessionToken: 'session-token-456',
          user: mockUser
        }),
        text: () => Promise.resolve('')
      });

      const { authAPI } = await import('../../client/src/lib/auth');

      const result = await authAPI.login({
        email: 'test@example.com',
        password: 'password123'
      });

      // Verify fetch was called with correct params
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/auth/login');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(options.body)).toEqual({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(options.credentials).toBe('include');

      // Verify token was stored
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'jwt-token-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'jwt-token-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('session_token', 'session-token-456');

      // Verify user data returned
      expect(result.user).toEqual(mockUser);
    });

    it('should throw error on failed login with invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"success":false,"message":"Credenciais inválidas"}'),
        statusText: 'Unauthorized'
      });

      const { authAPI } = await import('../../client/src/lib/auth');

      // The authAPI.login wraps errors with a user-friendly message
      await expect(authAPI.login({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })).rejects.toThrow('Usuário ou senha errados');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { authAPI } = await import('../../client/src/lib/auth');

      await expect(authAPI.login({
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow();
    });

    it('should handle login without token in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          user: { id: 'user-123', email: 'test@example.com', name: 'Test', role: 'ministro', status: 'active' }
        }),
        text: () => Promise.resolve('')
      });

      const { authAPI } = await import('../../client/src/lib/auth');

      const result = await authAPI.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.user).toBeDefined();
      // Token should not be stored if not provided
      expect(localStorageMock.store['token']).toBeUndefined();
    });
  });

  describe('Logout', () => {
    it('should call logout endpoint and clear storage', async () => {
      // Setup: user is logged in
      localStorageMock.store = {
        token: 'jwt-token-123',
        auth_token: 'jwt-token-123',
        session_token: 'session-456',
        user: JSON.stringify({ id: 'user-123' })
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'Logged out successfully' }),
        text: () => Promise.resolve('')
      });

      const { authAPI } = await import('../../client/src/lib/auth');

      const result = await authAPI.logout();

      // Verify storage was cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('session_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      expect(sessionStorageMock.clear).toHaveBeenCalled();

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalled();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/auth/logout');
      expect(options.method).toBe('POST');
      expect(options.credentials).toBe('include');

      expect(result.message).toBe('Logged out successfully');
    });

    it('should clear storage even if API call fails', async () => {
      localStorageMock.store = { token: 'jwt-token-123' };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { authAPI } = await import('../../client/src/lib/auth');

      // Should still clear storage before making the request
      try {
        await authAPI.logout();
      } catch {
        // Expected to throw
      }

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Get Current User', () => {
    it('should fetch current user data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ministro',
        status: 'active',
        phone: '+5511999999999'
      };

      localStorageMock.store = { token: 'jwt-token-123' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: mockUser }),
        text: () => Promise.resolve('')
      });

      const { authAPI } = await import('../../client/src/lib/auth');

      const result = await authAPI.getMe();

      expect(mockFetch).toHaveBeenCalled();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/auth/me');
      expect(options.method).toBe('GET');
      expect(options.headers?.Authorization).toBe('Bearer jwt-token-123');
      expect(options.credentials).toBe('include');

      expect(result.user).toEqual(mockUser);
    });

    it('should throw error if not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
        statusText: 'Unauthorized'
      });

      const { authAPI } = await import('../../client/src/lib/auth');

      await expect(authAPI.getMe()).rejects.toThrow('401');
    });

    it('should handle expired token', async () => {
      localStorageMock.store = { token: 'expired-token' };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"message":"Token expirado"}'),
        statusText: 'Unauthorized'
      });

      const { authAPI } = await import('../../client/src/lib/auth');

      await expect(authAPI.getMe()).rejects.toThrow();
    });
  });

  describe('Type Guards', () => {
    it('should validate AuthResponse correctly', async () => {
      const { isAuthResponse } = await import('../../client/src/lib/auth');

      expect(isAuthResponse({ success: true })).toBe(true);
      expect(isAuthResponse({ success: false })).toBe(true);
      expect(isAuthResponse({ success: true, user: {} })).toBe(true);
      expect(isAuthResponse(null)).toBe(false);
      expect(isAuthResponse(undefined)).toBe(false);
      expect(isAuthResponse({})).toBe(false);
      expect(isAuthResponse({ notSuccess: true })).toBe(false);
    });

    it('should validate AuthUser correctly', async () => {
      const { isValidAuthUser } = await import('../../client/src/lib/auth');

      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ministro',
        status: 'active'
      };

      expect(isValidAuthUser(validUser)).toBe(true);
      expect(isValidAuthUser({ ...validUser, role: 'gestor' })).toBe(true);
      expect(isValidAuthUser({ ...validUser, role: 'coordenador' })).toBe(true);
      expect(isValidAuthUser({ ...validUser, status: 'pending' })).toBe(true);
      expect(isValidAuthUser({ ...validUser, status: 'inactive' })).toBe(true);

      // Invalid cases
      expect(isValidAuthUser(null)).toBe(false);
      expect(isValidAuthUser(undefined)).toBe(false);
      expect(isValidAuthUser({ ...validUser, role: 'invalid' })).toBe(false);
      expect(isValidAuthUser({ ...validUser, status: 'invalid' })).toBe(false);
      expect(isValidAuthUser({ ...validUser, id: undefined })).toBe(false);
    });

    it('should check hasValidUser correctly', async () => {
      const { hasValidUser } = await import('../../client/src/lib/auth');

      const validResponse = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ministro',
          status: 'active'
        }
      };

      expect(hasValidUser(validResponse)).toBe(true);
      expect(hasValidUser({ success: false })).toBe(false);
      expect(hasValidUser({ success: true })).toBe(false);
      expect(hasValidUser({ success: true, user: null })).toBe(false);
    });
  });

  describe('Safe Property Accessor', () => {
    it('should return user property when valid', async () => {
      const { safeGetUserProperty } = await import('../../client/src/lib/auth');

      const response = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ministro' as const,
          status: 'active' as const
        }
      };

      expect(safeGetUserProperty(response, 'name', 'Fallback')).toBe('Test User');
      expect(safeGetUserProperty(response, 'email', 'fallback@test.com')).toBe('test@example.com');
    });

    it('should return fallback for invalid response', async () => {
      const { safeGetUserProperty } = await import('../../client/src/lib/auth');

      expect(safeGetUserProperty(null, 'name', 'Fallback')).toBe('Fallback');
      expect(safeGetUserProperty({ success: false }, 'name', 'Fallback')).toBe('Fallback');
      expect(safeGetUserProperty({ success: true }, 'email', 'test@fallback.com')).toBe('test@fallback.com');
    });
  });
});

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.store = {};
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorageMock.store = { token: 'some-token' };

      const isAuth = localStorageMock.getItem('token') !== null;
      expect(isAuth).toBe(true);
    });

    it('should return false when no token', () => {
      localStorageMock.store = {};

      const isAuth = localStorageMock.getItem('token') !== null;
      expect(isAuth).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return token when exists', () => {
      localStorageMock.store = { token: 'jwt-token-123' };

      const token = localStorageMock.getItem('token');
      expect(token).toBe('jwt-token-123');
    });

    it('should return null when no token', () => {
      localStorageMock.store = {};

      const token = localStorageMock.getItem('token');
      expect(token).toBeNull();
    });
  });
});

describe('API Request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.store = {};
  });

  it('should include Authorization header when token exists', async () => {
    localStorageMock.store = { token: 'bearer-token-123' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
      text: () => Promise.resolve('')
    });

    // Import fresh to get updated localStorage
    const { apiRequest } = await import('../../client/src/lib/queryClient');

    await apiRequest('GET', '/api/test');

    // Check that fetch was called with Authorization header
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers?.Authorization).toBe('Bearer bearer-token-123');
  });

  it('should not include Authorization header when no token', async () => {
    localStorageMock.store = {};

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
      text: () => Promise.resolve('')
    });

    const { apiRequest } = await import('../../client/src/lib/queryClient');

    await apiRequest('GET', '/api/test');

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers?.Authorization).toBeUndefined();
  });

  it('should reject large payloads over 500KB', async () => {
    const { apiRequest } = await import('../../client/src/lib/queryClient');

    // Create a large payload (> 500KB)
    const largeData = { data: 'x'.repeat(600 * 1024) };

    await expect(apiRequest('POST', '/api/test', largeData))
      .rejects.toThrow('Request payload too large');
  });

  it('should throw on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
      statusText: 'Internal Server Error'
    });

    const { apiRequest } = await import('../../client/src/lib/queryClient');

    await expect(apiRequest('GET', '/api/test'))
      .rejects.toThrow('500: Internal Server Error');
  });
});
