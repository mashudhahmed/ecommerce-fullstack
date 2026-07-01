// services/auth.service.ts
import { apiClient } from '@/lib/api-client';
import { User, AuthResponse, LoginCredentials, RegisterData } from '@/types';

// ============================================================
// AUTH ERROR CLASS
// ============================================================
export class AuthError extends Error {
  public readonly statusCode: number;
  public readonly errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number = 500, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

// ============================================================
// BACKEND RESPONSE TYPES
// ============================================================

interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BackendLoginResponse {
  message: string;
  access_token: string;
  user: BackendUser;
}

interface BackendVerifyEmailResponse {
  message: string;
  access_token: string;
  user: BackendUser;
}

interface BackendRegisterResponse {
  message: string;
  userId: number;
  email: string;
  requiresVerification: boolean;
}

interface BackendMeResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Convert string role to typed role
 * Ensures role is one of the allowed values
 */
function toUserRole(role: string): 'user' | 'admin' | 'superadmin' {
  if (role === 'admin') return 'admin';
  if (role === 'superadmin') return 'superadmin';
  return 'user';
}

/**
 * Create a properly typed User object from backend response
 */
function createUser(data: BackendUser): User {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: toUserRole(data.role),
    isVerified: data.isVerified,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Convert any error to AuthError
 */
function toAuthError(error: any, fallbackMessage: string): AuthError {
  // If already an AuthError, return it
  if (error instanceof AuthError) return error;

  // Extract status code
  const statusCode = error?.statusCode ?? error?.response?.status ?? 500;
  
  // Extract message
  let message = fallbackMessage;
  if (error?.message) {
    message = error.message;
  } else if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Extract validation errors
  const errors = error?.errors ?? error?.response?.data?.errors;

  return new AuthError(message, statusCode, errors);
}

// ============================================================
// AUTH SERVICE
// ============================================================

export const authService = {
  /**
   * Login user with email and password
   * @param credentials - Email and password
   * @returns AuthResponse with user and access_token
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<BackendLoginResponse>('/auth/login', credentials);
      
      return {
        message: response.data.message,
        access_token: response.data.access_token,
        user: createUser(response.data.user),
      };
    } catch (error: any) {
      throw toAuthError(error, 'Login failed. Please try again.');
    }
  },

  /**
   * Register a new user
   * @param data - User registration data
   * @returns AuthResponse with user info
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<BackendRegisterResponse>('/auth/register', data);
      
      // ✅ Registration creates a user with 'user' role
      return {
        message: response.data.message,
        user: {
          id: response.data.userId,
          name: data.name,
          email: response.data.email,
          role: 'user',
          isVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      throw toAuthError(error, 'Registration failed. Please try again.');
    }
  },

  /**
   * Verify user email with verification code
   * @param email - User email
   * @param code - 6-digit verification code
   * @returns AuthResponse with user and access_token
   */
  async verifyEmail(email: string, code: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<BackendVerifyEmailResponse>('/auth/verify-email', { email, code });
      
      return {
        message: response.data.message,
        access_token: response.data.access_token,
        user: createUser(response.data.user),
      };
    } catch (error: any) {
      throw toAuthError(error, 'Verification failed. Please try again.');
    }
  },

  /**
   * Resend verification code to email
   * @param email - User email
   * @returns Success message
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/resend-verification', { email });
      return response.data;
    } catch (error: any) {
      throw toAuthError(error, 'Failed to resend verification code.');
    }
  },

  /**
   * Get current authenticated user
   * @returns User object
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<BackendMeResponse>('/auth/me');
      return createUser(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Session expired. Please login again.');
    }
  },

  /**
   * Logout current user
   * @returns Success message
   */
  async logout(): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/logout');
      return response.data;
    } catch {
      // ✅ Logout should always succeed from client perspective
      return { message: 'Logged out successfully' };
    }
  },

  /**
   * Logout from all sessions
   * @returns Success message and number of sessions ended
   */
  async logoutAll(): Promise<{ message: string; sessionsEnded: number }> {
    try {
      const response = await apiClient.post<{ message: string; sessionsEnded: number }>('/auth/logout-all');
      return response.data;
    } catch (error: any) {
      throw toAuthError(error, 'Failed to log out of all sessions.');
    }
  },

  /**
   * Request password reset email
   * @param email - User email
   * @returns Success message
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw toAuthError(error, 'Failed to send reset code.');
    }
  },

  /**
   * Verify reset code and get verification token
   * @param email - User email
   * @param code - 6-digit reset code
   * @returns Verification token for password reset
   */
  async verifyResetCode(email: string, code: string): Promise<{ verificationToken: string }> {
    try {
      const response = await apiClient.post<{ verificationToken: string }>('/auth/verify-reset-code', { email, code });
      return response.data;
    } catch (error: any) {
      throw toAuthError(error, 'Invalid or expired code.');
    }
  },

  /**
   * Reset password with verification token
   * @param verificationToken - Token from verifyResetCode
   * @param newPassword - New password
   * @returns Success message
   */
  async resetPassword(verificationToken: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/reset-password', {
        verificationToken,
        newPassword,
      });
      return response.data;
    } catch (error: any) {
      throw toAuthError(error, 'Failed to reset password.');
    }
  },

  /**
   * Change password (requires authentication)
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Success message
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error: any) {
      throw toAuthError(error, 'Failed to change password.');
    }
  },
};

// ============================================================
// EXPORTS
// ============================================================

export default authService;