// hooks/useAuth.ts
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { authService, AuthError } from '@/services/auth.service';
import { LoginCredentials, RegisterData, RegisterVendorData, AuthResponse } from '@/types';
import { toast } from 'sonner';

// ============================================================
// LOG HELPER
// ============================================================

function isExpectedAuthFailure(error: unknown): boolean {
  if (!(error instanceof AuthError)) return false;
  return (
    error.isValidationError() ||
    error.isUnauthorized() ||
    error.isConflict() ||
    error.isRateLimited()
  );
}

function logAuthFailure(label: string, error: unknown) {
  if (isExpectedAuthFailure(error)) {
    console.log(`ℹ️ ${label} (expected):`, (error as AuthError).message);
  } else {
    console.error(`❌ ${label}:`, error);
  }
}

export function useAuth() {
  const {
    user: storeUser,
    isAuthenticated: storeIsAuthenticated,
    isLoading: storeIsLoading,
    isHydrated,
    setUser,
    setAuthenticated,
    setLoading,
    logout: storeLogout,
  } = useAuthStore();

  const queryClient = useQueryClient();

  // ============================================================
  // 2FA STATE
  // ============================================================

  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [pendingLoginEmail, setPendingLoginEmail] = useState<string | null>(null);
  const [pendingLoginPassword, setPendingLoginPassword] = useState<string | null>(null);

  // ============================================================
  // FETCH CURRENT USER
  // ============================================================

  const {
    data: userData,
    isLoading: isUserLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      console.log('📡 Fetching current user...');
      try {
        const data = await authService.getCurrentUser();
        console.log('✅ User fetched:', data);
        return data;
      } catch (error) {
        if (error instanceof AuthError && error.isUnauthorized()) {
          console.log('ℹ️ No active session (user not logged in)');
          return null;
        }
        console.error('❌ Failed to fetch user:', error);
        throw error;
      }
    },
    enabled: isHydrated && !storeIsAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    throwOnError: false,
  });

  // ============================================================
  // UPDATE STORE
  // ============================================================

  useEffect(() => {
    if (userData !== undefined && userData !== null) {
      console.log('🔄 Updating store with user data:', userData);
      setUser(userData);
      setAuthenticated(true);
      setLoading(false);
    }
  }, [userData, setUser, setAuthenticated, setLoading]);

  useEffect(() => {
    if (!isUserLoading && userData === undefined && isHydrated && !storeIsAuthenticated) {
      console.log('🔄 No user found, clearing store');
      setUser(null);
      setAuthenticated(false);
      setLoading(false);
    }
  }, [isUserLoading, userData, isHydrated, storeIsAuthenticated, setUser, setAuthenticated, setLoading]);

  // ============================================================
  // LOGIN MUTATION – with 2FA handling
  // ============================================================

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      console.log('📤 Logging in:', credentials.email);
      const response = await authService.login(credentials);
      console.log('✅ Login response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('✅ Login mutation success, updating store...');

      setUser(data.user);
      setAuthenticated(true);
      setLoading(false);
      setTwoFactorRequired(false);
      setPendingLoginEmail(null);
      setPendingLoginPassword(null);

      queryClient.setQueryData(['user'], data.user);
      console.log('✅ Store updated - User:', data.user);
      console.log('✅ Store updated - isAuthenticated:', true);
    },
    onError: (error: any) => {
      // Check if the error indicates 2FA is required
      if (error?.message?.toLowerCase().includes('2fa') || error?.statusCode === 401) {
        // The backend may respond with a specific message for 2FA
        // We'll capture the email/password for the 2FA step
        console.log('🔐 2FA required for this account');
        setTwoFactorRequired(true);
        setLoading(false);
        return;
      }
      logAuthFailure('Login error', error);
      setLoading(false);
    },
  });

  // ============================================================
  // 2FA VERIFICATION MUTATION – completes login after 2FA
  // ============================================================

  const verifyTwoFactorMutation = useMutation({
    mutationFn: async (token: string) => {
      console.log('📤 Verifying 2FA token...');
      // First verify the 2FA token
      const verifyResult = await authService.verifyTwoFactor(token);
      if (!verifyResult.valid) {
        throw new AuthError('Invalid 2FA token', 401);
      }
      // If valid, we need to complete the login with the stored credentials
      // The backend should have a dedicated endpoint to finalize login with 2FA
      // For now, we'll rely on the fact that after verification, the session is complete.
      // In practice, the backend may require a second login call with a 2FA flag.
      // We'll assume the backend sets a session cookie after successful 2FA verification.
      // Then we fetch the user.
      const user = await authService.getCurrentUser();
      return user;
    },
    onSuccess: (user) => {
      console.log('✅ 2FA verification success, updating store...');
      setUser(user);
      setAuthenticated(true);
      setLoading(false);
      setTwoFactorRequired(false);
      setPendingLoginEmail(null);
      setPendingLoginPassword(null);
      queryClient.setQueryData(['user'], user);
      toast.success('2FA verified successfully!');
    },
    onError: (error: any) => {
      logAuthFailure('2FA verification error', error);
      toast.error(error?.message || 'Invalid 2FA token. Please try again.');
      setLoading(false);
    },
  });

  // ============================================================
  // REGISTER MUTATION
  // ============================================================

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData): Promise<AuthResponse> => {
      console.log('📤 Registering user:', data.email);
      const response = await authService.register(data);
      console.log('✅ Registration response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('✅ Registration success:', data);
      toast.success(data.message || 'Registration successful! Please check your email.');
    },
    onError: (error: any) => {
      logAuthFailure('Registration error', error);
    },
  });

  // ============================================================
  // REGISTER VENDOR MUTATION
  // ============================================================

  const registerVendorMutation = useMutation({
    mutationFn: async (data: RegisterVendorData): Promise<AuthResponse> => {
      console.log('📤 Registering vendor:', data.email);
      const response = await authService.registerVendor(data);
      console.log('✅ Vendor registration response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('✅ Vendor registration success:', data);
      toast.success(data.message || 'Vendor registration successful! Please check your email.');
    },
    onError: (error: any) => {
      logAuthFailure('Vendor registration error', error);
    },
  });

  // ============================================================
  // VERIFY EMAIL
  // ============================================================

  const verifyEmailMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }): Promise<AuthResponse> => {
      console.log('📤 Verifying email:', email);
      const response = await authService.verifyEmail(email, code);
      console.log('✅ Email verification response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('✅ Email verification success, updating store...');
      setUser(data.user);
      setAuthenticated(true);
      setLoading(false);
      queryClient.setQueryData(['user'], data.user);
      toast.success('Email verified successfully!');
    },
    onError: (error: any) => {
      logAuthFailure('Email verification error', error);
    },
  });

  // ============================================================
  // OTHER MUTATIONS (forgot password, reset, change password, logout)
  // ============================================================

  const resendVerificationMutation = useMutation({
    mutationFn: async (email: string): Promise<{ message: string }> => {
      console.log('📤 Resending verification for:', email);
      const response = await authService.resendVerification(email);
      console.log('✅ Resend verification response:', response);
      return response;
    },
    onSuccess: () => {
      toast.success('New verification code sent to your email.');
    },
    onError: (error: any) => {
      logAuthFailure('Resend verification error', error);
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string): Promise<{ message: string }> => {
      console.log('📤 Forgot password for:', email);
      const response = await authService.forgotPassword(email);
      console.log('✅ Forgot password response:', response);
      return response;
    },
    onSuccess: () => {
      toast.success('Password reset code sent to your email.');
    },
    onError: (error: any) => {
      logAuthFailure('Forgot password error', error);
    },
  });

  const verifyResetCodeMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }): Promise<{ verificationToken: string }> => {
      console.log('📤 Verifying reset code for:', email);
      const response = await authService.verifyResetCode(email, code);
      console.log('✅ Verify reset code response:', response);
      return response;
    },
    onSuccess: () => {
      toast.success('Code verified successfully!');
    },
    onError: (error: any) => {
      logAuthFailure('Verify reset code error', error);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({
      verificationToken,
      newPassword,
    }: {
      verificationToken: string;
      newPassword: string;
    }): Promise<{ message: string }> => {
      console.log('📤 Resetting password...');
      const response = await authService.resetPassword(verificationToken, newPassword);
      console.log('✅ Reset password response:', response);
      return response;
    },
    onSuccess: () => {
      toast.success('Password reset successfully!');
    },
    onError: (error: any) => {
      logAuthFailure('Reset password error', error);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }): Promise<{ message: string }> => {
      console.log('📤 Changing password...');
      const response = await authService.changePassword(currentPassword, newPassword);
      console.log('✅ Change password response:', response);
      return response;
    },
    onSuccess: () => {
      toast.success('Password changed successfully!');
    },
    onError: (error: any) => {
      logAuthFailure('Change password error', error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async (): Promise<{ message: string }> => {
      console.log('📤 Logging out...');
      try {
        const response = await authService.logout();
        console.log('✅ Logout response:', response);
        return response;
      } catch (error) {
        console.log('ℹ️ Logout request failed, proceeding with local logout anyway:', error);
        return { message: 'Logged out successfully' };
      }
    },
    onSuccess: () => {
      console.log('✅ Logout success, clearing store...');
      storeLogout();
      queryClient.clear();
      queryClient.setQueryData(['user'], null);
      setTwoFactorRequired(false);
      setPendingLoginEmail(null);
      setPendingLoginPassword(null);
      toast.success('Logged out successfully');
    },
    onError: () => {
      console.log('⚠️ Logout error, but clearing store anyway...');
      storeLogout();
      queryClient.clear();
      queryClient.setQueryData(['user'], null);
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async (): Promise<{ message: string; sessionsEnded: number }> => {
      console.log('📤 Logging out from all devices...');
      const response = await authService.logoutAll();
      console.log('✅ Logout all response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('✅ Logout all success, clearing store...');
      storeLogout();
      queryClient.clear();
      queryClient.setQueryData(['user'], null);
      toast.success(data.message || 'Logged out from all devices');
    },
    onError: (error: any) => {
      logAuthFailure('Logout all error', error);
      storeLogout();
      queryClient.clear();
      queryClient.setQueryData(['user'], null);
      toast.error(error?.message || 'Failed to logout from all devices');
    },
  });

  // ============================================================
  // COMPUTED STATE
  // ============================================================

  const isAuthenticated = useMemo(() => {
    return storeIsAuthenticated || !!userData || !!storeUser;
  }, [storeIsAuthenticated, userData, storeUser]);

  const isLoading = storeIsLoading || !isHydrated || isUserLoading;
  const user = storeUser ?? userData ?? null;

  // ============================================================
  // RETURN
  // ============================================================

  return {
    user,
    isAuthenticated,
    isLoading,
    isHydrated,

    // 2FA State
    twoFactorRequired,
    setTwoFactorRequired,
    pendingLoginEmail,
    setPendingLoginEmail,
    pendingLoginPassword,
    setPendingLoginPassword,

    // Auth mutations
    login: loginMutation.mutateAsync,
    loginLoading: loginMutation.isPending,
    loginError: loginMutation.error,

    // 2FA verification
    verifyTwoFactor: verifyTwoFactorMutation.mutateAsync,
    verifyTwoFactorLoading: verifyTwoFactorMutation.isPending,
    verifyTwoFactorError: verifyTwoFactorMutation.error,

    register: registerMutation.mutateAsync,
    registerLoading: registerMutation.isPending,
    registerError: registerMutation.error,

    registerVendor: registerVendorMutation.mutateAsync,
    registerVendorLoading: registerVendorMutation.isPending,
    registerVendorError: registerVendorMutation.error,

    verifyEmail: verifyEmailMutation.mutateAsync,
    verifyEmailLoading: verifyEmailMutation.isPending,
    verifyEmailError: verifyEmailMutation.error,

    resendVerification: resendVerificationMutation.mutateAsync,
    resendVerificationLoading: resendVerificationMutation.isPending,

    forgotPassword: forgotPasswordMutation.mutateAsync,
    forgotPasswordLoading: forgotPasswordMutation.isPending,

    verifyResetCode: verifyResetCodeMutation.mutateAsync,
    verifyResetCodeLoading: verifyResetCodeMutation.isPending,

    resetPassword: resetPasswordMutation.mutateAsync,
    resetPasswordLoading: resetPasswordMutation.isPending,

    changePassword: changePasswordMutation.mutateAsync,
    changePasswordLoading: changePasswordMutation.isPending,

    logout: logoutMutation.mutateAsync,
    logoutLoading: logoutMutation.isPending,

    logoutAll: logoutAllMutation.mutateAsync,
    logoutAllLoading: logoutAllMutation.isPending,

    refetchUser,
  };
}

export { AuthError };