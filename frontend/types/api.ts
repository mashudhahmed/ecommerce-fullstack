// types/api.ts

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
  path: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResult<T> {
  data: T;
  message?: string;
  statusCode: number;
}

// ============================================================
// API ERROR HANDLING
// ============================================================

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors?: Record<string, string[]>;
  public readonly path?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    errors?: Record<string, string[]>,
    path?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.path = path;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static fromResponse(response: ApiErrorResponse): ApiError {
    return new ApiError(
      response.message,
      response.statusCode,
      response.errors,
      response.path
    );
  }

  isValidationError(): boolean {
    return this.statusCode === 400 && !!this.errors;
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isForbidden(): boolean {
    return this.statusCode === 403;
  }

  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  isConflict(): boolean {
    return this.statusCode === 409;
  }

  isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  getErrorMessage(): string {
    if (this.isValidationError() && this.errors) {
      const messages: string[] = [];
      Object.entries(this.errors).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          messages.push(`${key}: ${value.join(', ')}`);
        } else {
          messages.push(`${key}: ${value}`);
        }
      });
      return messages.join('; ');
    }
    return this.message;
  }

  getValidationErrors(): Record<string, string[]> | undefined {
    return this.isValidationError() ? this.errors : undefined;
  }
}

// ============================================================
// API FILTERS
// ============================================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
}

export interface SearchParams extends PaginationParams, FilterParams {}

// ============================================================
// API ENDPOINTS
// ============================================================

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/auth/register',
    REGISTER_VENDOR: '/auth/register/vendor',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    LOGOUT_ALL: '/auth/logout-all',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_RESET_CODE: '/auth/verify-reset-code',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    PENDING_VENDORS: '/auth/vendors/pending',
    APPROVE_VENDOR: (id: number) => `/auth/vendors/${id}/approve`,
    REJECT_VENDOR: (id: number) => `/auth/vendors/${id}/reject`,
  },

  // Users
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_EMAIL: '/users/profile/email',
    DELETE_ACCOUNT: '/users/profile',
    ADMIN_LIST: '/users',
    ADMIN_GET: (id: number) => `/users/${id}`,
    ADMIN_UPDATE: (id: number) => `/users/${id}`,
    ADMIN_DELETE: (id: number) => `/users/${id}`,
    VENDORS_PENDING: '/users/vendors/pending',
    VENDORS_APPROVED: '/users/vendors/approved',
    VENDORS_APPROVE: (id: number) => `/users/vendors/${id}/approve`,
    VENDORS_REJECT: (id: number) => `/users/vendors/${id}/reject`,
    STATS: '/users/stats',
    SEARCH: '/users/search',
  },

  // Products
  PRODUCTS: {
    LIST: '/products',
    GET: (id: number) => `/products/${id}`,
    CREATE: '/products',
    UPDATE: (id: number) => `/products/${id}`,
    DELETE: (id: number) => `/products/${id}`,
    PERMANENT_DELETE: (id: number) => `/products/${id}/permanent`,
    IN_STOCK: '/products/in-stock',
    OUT_OF_STOCK: '/products/out-of-stock',
    LOW_STOCK: '/products/low-stock',
    VENDOR_MY: '/products/vendor/my',
    VENDOR_STATS: '/products/vendor/stats',
    BULK_STOCK: '/products/vendor/bulk-stock',
    SEARCH: '/products/search',
  },

  // Categories
  CATEGORIES: {
    LIST: '/categories',
    TREE: '/categories/tree',
    GET: (id: number) => `/categories/${id}`,
    BY_SLUG: (slug: string) => `/categories/slug/${slug}`,
    CREATE: '/categories',
    UPDATE: (id: number) => `/categories/${id}`,
    DELETE: (id: number) => `/categories/${id}`,
    STATS: '/categories/stats',
  },

  // Cart
  CART: {
    GET: '/cart',
    ADD: '/cart',
    UPDATE: '/cart',
    REMOVE: (productId: number) => `/cart/item/${productId}`,
    CLEAR: '/cart',
    SUMMARY: '/cart/summary',
    TOTAL: '/cart/total',
    COUNT: '/cart/count',
    CHECKOUT: '/cart/checkout',
    MERGE: '/cart/merge',
  },

  // Orders
  ORDERS: {
    CREATE: '/orders',
    MY_ORDERS: '/orders/my',
    MY_SUMMARY: '/orders/my/summary',
    VENDOR_ORDERS: '/orders/vendor',
    VENDOR_SUMMARY: '/orders/vendor/summary',
    GET: (id: number) => `/orders/${id}`,
    UPDATE_STATUS: (id: number) => `/orders/${id}/status`,
    CANCEL: (id: number) => `/orders/${id}/cancel`,
    VENDOR_UPDATE: (id: number) => `/orders/${id}/vendor-status`,
    ADMIN_LIST: '/orders',
    ADMIN_STATS: '/orders/admin/stats',
    ADMIN_UPDATE: (id: number) => `/orders/${id}/status`,
  },

  // Admin
  ADMIN: {
    STATS: '/admin/stats',
    PRODUCTS: '/admin/products',
    ORDERS: '/admin/orders',
    ORDER_STATUS: (id: number) => `/admin/order/${id}/status`,
    USERS: '/admin/users',
    USER: (id: number) => `/admin/users/${id}`,
    DELETE_USER: (id: number) => `/admin/users/${id}`,
    VENDORS: '/admin/vendors',
    PENDING_VENDORS: '/admin/vendors/pending',
  },

  // SuperAdmin
  SUPERADMIN: {
    CREATE_ADMIN: '/superadmin/admins',
    LIST_ADMINS: '/superadmin/admins',
    DELETE_ADMIN: (id: number) => `/superadmin/admins/${id}`,
    LIST_USERS: '/superadmin/users',
    DELETE_USER: (id: number) => `/superadmin/users/${id}`,
  },

  // Health
  HEALTH: {
    CHECK: '/health',
    LIVENESS: '/health/liveness',
    READINESS: '/health/readiness',
  },

  // Search
  SEARCH: {
    SEARCH: '/search',
    AUTOCOMPLETE: '/search/autocomplete',
    POPULAR: '/search/popular',
    REINDEX: '/search/reindex',
  },
};

// ============================================================
// API STATUS CODES
// ============================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

// ============================================================
// API HEADERS
// ============================================================

export const API_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  APPLICATION_JSON: 'application/json',
  AUTHORIZATION: 'Authorization',
  BEARER: 'Bearer',
  ACCEPT: 'Accept',
  X_REQUESTED_WITH: 'X-Requested-With',
  X_CSRF_TOKEN: 'X-CSRF-Token',
};

// ============================================================
// API ERROR MESSAGES
// ============================================================

export const API_ERROR_MESSAGES = {
  NETWORK: 'Network error - Please check your connection',
  TIMEOUT: 'Request timeout - Please try again',
  UNAUTHORIZED: 'You need to be logged in to access this resource',
  FORBIDDEN: 'You do not have permission to access this resource',
  NOT_FOUND: 'The requested resource was not found',
  CONFLICT: 'The resource already exists',
  SERVER_ERROR: 'Server error - Please try again later',
  VALIDATION: 'Please check your input and try again',
  RATE_LIMIT: 'Too many requests - Please wait before trying again',
  MAINTENANCE: 'The system is currently under maintenance',
  UNKNOWN: 'An unexpected error occurred',
};

// ============================================================
// API HELPER TYPES
// ============================================================

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestConfig {
  method?: ApiMethod;
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  withCredentials?: boolean;
}

export interface ApiRequestOptions {
  showLoader?: boolean;
  showToast?: boolean;
  errorMessage?: string;
  successMessage?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

export type ApiInterceptor = (config: ApiRequestConfig) => ApiRequestConfig | Promise<ApiRequestConfig>;

export type ApiResponseInterceptor = (response: any) => any | Promise<any>;

export type ApiErrorInterceptor = (error: any) => any | Promise<any>;