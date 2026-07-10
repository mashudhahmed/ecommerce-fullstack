// services/auth.service.ts
import { apiClient, unwrapData } from '@/lib/api-client';
import { User, AuthResponse, LoginCredentials, RegisterData, RegisterVendorData } from '@/types';

// ============================================================
// AUTH ERROR CLASS
// ============================================================

export class AuthError extends Error {
  public readonly statusCode: number;
  public readonly errors?: Record<string, string[]>;
  public retryAfter: number;
  public requiresTwoFactor?: boolean;

  constructor(
    message: string, 
    statusCode: number = 500, 
    errors?: Record<string, string[]>,
    requiresTwoFactor: boolean = false
  ) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.retryAfter = 0;
    this.requiresTwoFactor = requiresTwoFactor;
    Object.setPrototypeOf(this, AuthError.prototype);
  }

  isValidationError(): boolean {
    return this.statusCode === 400 && !!this.errors;
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isConflict(): boolean {
    return this.statusCode === 409;
  }

  isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  isTwoFactorRequired(): boolean {
    return this.requiresTwoFactor === true;
  }

  getDisplayMessage(): string {
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
}

// ============================================================
// BACKEND RESPONSE TYPES (Defined inside this file)
// ============================================================

interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  isVendorApproved?: boolean;
  isVendorRejected?: boolean;
  vendorBusinessName?: string;
  vendorBusinessDescription?: string;
  vendorPhoneNumber?: string;
  vendorAddress?: string;
  vendorBusinessRegistration?: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendAuthResponse {
  message: string;
  user: BackendUser;
  requiresTwoFactor?: boolean;
}

interface BackendRegisterResponse {
  success: boolean;
  message: string;
  userId: number;
  email: string;
  requiresVerification: boolean;
  requiresApproval?: boolean;
}

interface BackendPendingVendor {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  vendorBusinessName: string;
  vendorBusinessDescription?: string;
  vendorPhoneNumber?: string;
  vendorAddress?: string;
  vendorBusinessRegistration?: string;
}

// ============================================================
// HELPERS
// ============================================================

function toUserRole(role: string): 'user' | 'vendor' | 'admin' | 'superadmin' {
  if (role === 'admin') return 'admin';
  if (role === 'superadmin' || role === 'SUPERADMIN') return 'superadmin';
  if (role === 'vendor') return 'vendor';
  return 'user';
}

function createUser(data: BackendUser): User {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: toUserRole(data.role),
    isVerified: data.isVerified,
    isVendorApproved: data.isVendorApproved || false,
    isVendorRejected: data.isVendorRejected || false,
    vendorBusinessName: data.vendorBusinessName,
    vendorBusinessDescription: data.vendorBusinessDescription,
    vendorPhoneNumber: data.vendorPhoneNumber,
    vendorAddress: data.vendorAddress,
    vendorBusinessRegistration: data.vendorBusinessRegistration,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function toAuthError(error: any, fallbackMessage: string): AuthError {
  if (error instanceof AuthError) return error;
  
  if (error?.statusCode === 0 || error?.message?.includes('Network error')) {
    return new AuthError('Network error - Please check your connection', 0);
  }
  
  const statusCode = error?.statusCode ?? 500;
  const message = error?.message ?? fallbackMessage;
  const errors = error?.errors;
  const requiresTwoFactor = error?.requiresTwoFactor ?? false;
  
  return new AuthError(message, statusCode, errors, requiresTwoFactor);
}

// ============================================================
// AUTH SERVICE
// ============================================================

export const authService = {
  // ============================================================
  // LOGIN
  // ============================================================

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const data = unwrapData<BackendAuthResponse>(response.data);
      
      return {
        message: data.message,
        user: createUser(data.user),
        requiresTwoFactor: data.requiresTwoFactor || false,
      };
    } catch (error: any) {
      throw toAuthError(error, 'Login failed. Please try again.');
    }
  },

  // ============================================================
  // VERIFY 2FA AND COMPLETE LOGIN
  // ============================================================

  async verifyTwoFactorAndLogin(token: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        twoFactorToken: token,
      });
      const data = unwrapData<BackendAuthResponse>(response.data);
      return {
        message: data.message,
        user: createUser(data.user),
        requiresTwoFactor: false,
      };
    } catch (error: any) {
      if (error?.statusCode === 401) {
        throw new AuthError('Invalid 2FA code. Please try again.', 401);
      }
      throw toAuthError(error, 'Failed to verify 2FA code.');
    }
  },

  // ============================================================
  // VERIFY 2FA TOKEN (just validation)
  // ============================================================

  async verifyTwoFactor(token: string): Promise<{ valid: boolean }> {
    try {
      const response = await apiClient.post('/auth/2fa/verify', { token });
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to verify 2FA token.');
    }
  },

  // ============================================================
  // REGISTER
  // ============================================================

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', data);
      const result = unwrapData<BackendRegisterResponse>(response.data);
      return {
        message: result.message,
        user: {
          id: result.userId,
          name: data.name,
          email: result.email,
          role: 'user',
          isVerified: false,
          isVendorApproved: false,
          isVendorRejected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requiresTwoFactor: false,
      };
    } catch (error: any) {
      throw toAuthError(error, 'Registration failed. Please try again.');
    }
  },

  // ============================================================
  // REGISTER VENDOR
  // ============================================================

  async registerVendor(data: RegisterVendorData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register/vendor', data);
      const result = unwrapData<BackendRegisterResponse>(response.data);
      return {
        message: result.message,
        user: {
          id: result.userId,
          name: data.name,
          email: result.email,
          role: 'vendor',
          isVerified: false,
          isVendorApproved: false,
          isVendorRejected: false,
          vendorBusinessName: data.businessName,
          vendorBusinessDescription: data.businessDescription,
          vendorPhoneNumber: data.phoneNumber,
          vendorAddress: data.address,
          vendorBusinessRegistration: data.businessRegistration,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        requiresTwoFactor: false,
      };
    } catch (error: any) {
      throw toAuthError(error, 'Vendor registration failed. Please try again.');
    }
  },

  // ============================================================
  // EMAIL VERIFICATION
  // ============================================================

  async verifyEmail(email: string, code: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/verify-email', { email, code });
      const data = unwrapData<BackendAuthResponse>(response.data);
      return { 
        message: data.message, 
        user: createUser(data.user), 
        requiresTwoFactor: false 
      };
    } catch (error: any) {
      throw toAuthError(error, 'Verification failed. Please try again.');
    }
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post('/auth/resend-verification', { email });
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to resend verification code.');
    }
  },

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  async refresh(): Promise<User> {
    try {
      const response = await apiClient.post('/auth/refresh');
      const data = unwrapData<{ user: BackendUser }>(response.data);
      return createUser(data.user);
    } catch (error: any) {
      throw toAuthError(error, 'Session expired. Please login again.');
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get('/auth/me');
      return createUser(unwrapData<BackendUser>(response.data));
    } catch (error: any) {
      if (error?.statusCode === 0 || error?.message?.includes('Network error')) {
        console.warn('Backend not available - returning null');
        throw new AuthError('Backend server is not available. Please try again later.', 0);
      }
      throw toAuthError(error, 'Session expired. Please login again.');
    }
  },

  async logout(): Promise<{ message: string }> {
    try {
      const response = await apiClient.post('/auth/logout');
      return unwrapData(response.data);
    } catch {
      return { message: 'Logged out successfully' };
    }
  },

  async logoutAll(): Promise<{ message: string; sessionsEnded: number }> {
    try {
      const response = await apiClient.post('/auth/logout-all');
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to log out of all sessions.');
    }
  },

  // ============================================================
  // PASSWORD RESET
  // ============================================================

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to send reset code.');
    }
  },

  async verifyResetCode(email: string, code: string): Promise<{ verificationToken: string }> {
    try {
      const response = await apiClient.post('/auth/verify-reset-code', { email, code });
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Invalid or expired code.');
    }
  },

  async resetPassword(verificationToken: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post('/auth/reset-password', { verificationToken, newPassword });
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to reset password.');
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to change password.');
    }
  },

  // ============================================================
  // 2FA SETUP METHODS
  // ============================================================

  async generateTwoFactor(): Promise<{ secret: string; qrCode: string; otpauthUrl: string }> {
    try {
      const response = await apiClient.post('/auth/2fa/generate');
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to generate 2FA setup.');
    }
  },

  async enableTwoFactor(token: string): Promise<{ verified: boolean; backupCodes: string[] }> {
    try {
      const response = await apiClient.post('/auth/2fa/enable', { token });
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to enable 2FA. Please check your token.');
    }
  },

  async disableTwoFactor(token: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post('/auth/2fa/disable', { token });
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to disable 2FA.');
    }
  },

  async regenerateBackupCodes(): Promise<{ backupCodes: string[] }> {
    try {
      const response = await apiClient.post('/auth/2fa/backup-codes');
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to regenerate backup codes.');
    }
  },

  // ============================================================
  // VENDOR MANAGEMENT (Admin/SuperAdmin)
  // ============================================================

  async getPendingVendors(): Promise<User[]> {
    try {
      const response = await apiClient.get('/auth/vendors/pending');
      const list = unwrapData<BackendPendingVendor[]>(response.data) || [];
      return list.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        role: 'vendor',
        isVerified: false,
        isVendorApproved: false,
        isVendorRejected: false,
        vendorBusinessName: vendor.vendorBusinessName,
        vendorBusinessDescription: vendor.vendorBusinessDescription,
        vendorPhoneNumber: vendor.vendorPhoneNumber,
        vendorAddress: vendor.vendorAddress,
        vendorBusinessRegistration: vendor.vendorBusinessRegistration,
        createdAt: vendor.createdAt,
        updatedAt: vendor.createdAt,
      }));
    } catch (error: any) {
      throw toAuthError(error, 'Failed to fetch pending vendors.');
    }
  },

  async approveVendor(vendorId: number): Promise<{ message: string; vendor: User }> {
    try {
      const response = await apiClient.patch(`/auth/vendors/${vendorId}/approve`);
      const data = unwrapData<{ message: string; vendor: BackendUser }>(response.data);
      return { message: data.message, vendor: createUser(data.vendor) };
    } catch (error: any) {
      throw toAuthError(error, 'Failed to approve vendor.');
    }
  },

  async rejectVendor(vendorId: number, reason?: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.patch(`/auth/vendors/${vendorId}/reject`, { reason });
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to reject vendor.');
    }
  },

  // ============================================================
  // SUPER ADMIN
  // ============================================================

  async createAdmin(data: { name: string; email: string; password: string }): Promise<User> {
    try {
      const response = await apiClient.post('/superadmin/admins', data);
      return createUser(unwrapData<BackendUser>(response.data));
    } catch (error: any) {
      throw toAuthError(error, 'Failed to create admin.');
    }
  },

  async getAdmins(): Promise<User[]> {
    try {
      const response = await apiClient.get('/superadmin/admins');
      return (unwrapData<BackendUser[]>(response.data) || []).map(createUser);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to fetch admins.');
    }
  },

  async deleteAdmin(adminId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`/superadmin/admins/${adminId}`);
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to delete admin.');
    }
  },

  async deleteUser(userId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`/superadmin/users/${userId}`);
      return unwrapData(response.data);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to delete user.');
    }
  },

  async listAllUsers(): Promise<User[]> {
    try {
      const response = await apiClient.get('/superadmin/users');
      return (unwrapData<BackendUser[]>(response.data) || []).map(createUser);
    } catch (error: any) {
      throw toAuthError(error, 'Failed to fetch users.');
    }
  },
};

export default authService;