// lib/api-client.ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
  retryAfter?: number;
}

const AUTH_EXEMPT_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/register/vendor',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/verify-reset-code',
  '/auth/reset-password',
  '/auth/2fa/verify',
];

function isAuthExempt(url?: string): boolean {
  if (!url) return false;
  return AUTH_EXEMPT_PATHS.some((p) => url.includes(p));
}

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

class ApiClient {
  private instance: AxiosInstance;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  generateIdempotencyKey(): string {
    return uuidv4();
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config) => {
        if (config.url?.includes('/orders') && config.method?.toLowerCase() === 'post') {
          if (!config.headers['idempotency-key']) {
            config.headers['idempotency-key'] = this.generateIdempotencyKey();
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as RetryableConfig | undefined;
        const statusCode = error.response?.status;

        if (statusCode === 429) {
          const retryAfter = error.response?.headers?.['retry-after'];
          const errorData = this.buildApiError(error, statusCode);
          errorData.retryAfter = retryAfter ? parseInt(retryAfter, 10) : 60;
          return Promise.reject(errorData);
        }

        const shouldAttemptRefresh =
          statusCode === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !isAuthExempt(originalRequest.url);

        if (shouldAttemptRefresh && originalRequest) {
          originalRequest._retry = true;
          const refreshed = await this.refreshSession();
          if (refreshed) {
            return this.instance(originalRequest);
          }
          this.forceLogout();
        }

        return Promise.reject(this.buildApiError(error, statusCode));
      }
    );
  }

  private async refreshSession(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.instance
        .post('/auth/refresh')
        .then(() => true)
        .catch(() => false)
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  // ✅ FIXED: Skip redirect on public pages
  private forceLogout() {
    if (typeof window === 'undefined') return;

    const pathname = window.location.pathname;

    // ✅ Don't redirect on public pages (homepage, products, etc.)
    const isPublicPage = ['/', '/products'].some(
      (p) => pathname === p || pathname.startsWith('/products/')
    );

    // ✅ Don't redirect if already on auth page
    const isAuthPage = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'].some(
      (p) => pathname.includes(p)
    );

    // ✅ Always clear local storage
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('cart-storage');

    // ✅ Only redirect if NOT on public or auth page
    if (!isPublicPage && !isAuthPage) {
      window.location.href = '/login?session=expired';
    }

    // ✅ If on public page, stay there silently
  }

  private buildApiError(error: AxiosError, statusCode?: number): ApiError {
    const errorResponse = error.response?.data as any;
    const isNetworkError = !error.response;
    const isTimeout = error.code === 'ECONNABORTED';

    let message = 'An unexpected error occurred';
    let errors: Record<string, string[]> | undefined;

    if (errorResponse) {
      if (typeof errorResponse === 'string') {
        message = errorResponse;
      } else if (errorResponse.message) {
        if (typeof errorResponse.message === 'string') {
          message = errorResponse.message;
        } else if (Array.isArray(errorResponse.message)) {
          message = errorResponse.message.join('. ');
        } else if (typeof errorResponse.message === 'object') {
          const messages: string[] = [];
          Object.entries(errorResponse.message).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              messages.push(`${key}: ${value.join(', ')}`);
            } else if (typeof value === 'string') {
              messages.push(`${key}: ${value}`);
            }
          });
          message = messages.length > 0 ? messages.join('; ') : 'Validation failed';
          errors = errorResponse.message;
        }
      } else if (errorResponse.error) {
        message = errorResponse.error;
      }
    }

    if (isNetworkError) {
      message = 'Network error - Please check your connection';
    }
    if (isTimeout) {
      message = 'Request timeout - Please try again';
    }

    return {
      success: false,
      statusCode: statusCode ?? 0,
      message,
      error: errorResponse?.error,
      errors,
      path: error.config?.url,
      timestamp: new Date().toISOString(),
    };
  }

  public getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient().getInstance();

export function unwrapData<T>(payload: any): T {
  if (payload && typeof payload === 'object' && 'data' in payload && 'success' in payload) {
    return payload.data as T;
  }
  return payload as T;
}