// lib/api-client.ts - Update error handling
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config) => {
        const token = getCookie('token') || localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const errorResponse = error.response?.data as any;
        const statusCode = error.response?.status || 500;
        
        const apiError: ApiError = {
          success: false,
          statusCode,
          message: 'An unexpected error occurred',
          path: error.config?.url,
          timestamp: new Date().toISOString(),
        };

        if (errorResponse) {
          if (typeof errorResponse.message === 'string') {
            apiError.message = errorResponse.message;
          } else if (Array.isArray(errorResponse.message)) {
            apiError.message = errorResponse.message.join('. ');
          } else if (typeof errorResponse.message === 'object') {
            const messages: string[] = [];
            Object.entries(errorResponse.message).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                messages.push(`${key}: ${value.join(', ')}`);
              } else if (typeof value === 'string') {
                messages.push(`${key}: ${value}`);
              }
            });
            apiError.message = messages.length > 0 ? messages.join('; ') : 'Validation failed';
            apiError.errors = errorResponse.message;
          }

          if (errorResponse.error) {
            apiError.error = errorResponse.error;
          }
        }

        if (!error.response) {
          apiError.message = 'Network error - Please check your connection';
          apiError.statusCode = 0;
        }

        if (error.code === 'ECONNABORTED') {
          apiError.message = 'Request timeout - Please try again';
        }

        // ✅ Handle 401 - Auto logout only if not on auth pages
        if (statusCode === 401) {
          const isAuthPage = typeof window !== 'undefined' && 
            (window.location.pathname.includes('/login') ||
             window.location.pathname.includes('/register') ||
             window.location.pathname.includes('/verify-email') ||
             window.location.pathname.includes('/forgot-password') ||
             window.location.pathname.includes('/reset-password'));

          if (!isAuthPage) {
            deleteCookie('token');
            localStorage.removeItem('token');
            window.location.href = '/login?session=expired';
          }
        }

        // ✅ Only log errors for non-auth endpoints
        if (statusCode !== 401 || !error.config?.url?.includes('/auth')) {
          console.error('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: statusCode,
            message: apiError.message,
          });
        }

        return Promise.reject(apiError);
      }
    );
  }

  public getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient().getInstance();

export const setAuthToken = (token: string) => {
  setCookie('token', token, {
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  localStorage.setItem('token', token);
};

export const removeAuthToken = () => {
  deleteCookie('token');
  localStorage.removeItem('token');
};