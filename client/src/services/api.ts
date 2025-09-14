import { ApiResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

class ApiService {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  private buildURL(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseURL}${endpoint}`, window.location.origin);

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key].toString());
        }
      });
    }

    return url.toString();
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Erro na requisição'
      }));

      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data.data || data,
      message: data.message
    };
  }

  async request<T>(
    method: string,
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, headers, body, ...restOptions } = options;

    const token = this.getAuthToken();
    const url = this.buildURL(endpoint, params);

    const requestHeaders: HeadersInit = {
      ...this.defaultHeaders,
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
        ...restOptions,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Métodos convenientes
  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>('GET', endpoint, options);
  }

  post<T>(endpoint: string, data?: any, options?: RequestOptions) {
    return this.request<T>('POST', endpoint, { ...options, body: data });
  }

  put<T>(endpoint: string, data?: any, options?: RequestOptions) {
    return this.request<T>('PUT', endpoint, { ...options, body: data });
  }

  patch<T>(endpoint: string, data?: any, options?: RequestOptions) {
    return this.request<T>('PATCH', endpoint, { ...options, body: data });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>('DELETE', endpoint, options);
  }
}

// Instância padrão
export const api = new ApiService();

// Export da classe para criar instâncias customizadas
export default ApiService;