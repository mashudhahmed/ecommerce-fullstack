// hooks/useAuth.ts
import { useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { authService, AuthError } from '@/services/auth.service';
import { LoginCredentials } from '@/types';

export function useAuth() {
  const { user, isAuthenticated, setUser, setAuthenticated, setLoading, isLoading } = useAuthStore();
  const queryClient = useQueryClient();
  const hasCheckedRef = useRef(false);

  const checkAuth = useCallback(async () => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setAuthenticated(true);
    } catch {
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [setUser, setAuthenticated, setLoading]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ✅ LOGIN MUTATION
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      setUser(data.user);
      setAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      return data;
    },
  });

  // ✅ REGISTER MUTATION - FIXED: This was missing!
  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      // Registration doesn't auto-login, just return data
      return data;
    },
  });

  // ✅ LOGOUT MUTATION
  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      setUser(null);
      setAuthenticated(false);
      queryClient.clear();
    },
    onError: () => {
      setUser(null);
      setAuthenticated(false);
      queryClient.clear();
    },
  });

  // ✅ LOGOUT ALL MUTATION
  const logoutAllMutation = useMutation({
    mutationFn: authService.logoutAll,
    onSuccess: () => {
      setUser(null);
      setAuthenticated(false);
      queryClient.clear();
    },
  });

  // ✅ VERIFY EMAIL MUTATION
  const verifyEmailMutation = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => 
      authService.verifyEmail(email, code),
    onSuccess: (data) => {
      setUser(data.user);
      setAuthenticated(true);
      return data;
    },
  });

  // ✅ RESEND VERIFICATION MUTATION
  const resendVerificationMutation = useMutation({
    mutationFn: authService.resendVerification,
  });

  // ✅ FORGOT PASSWORD MUTATION
  const forgotPasswordMutation = useMutation({
    mutationFn: authService.forgotPassword,
  });

  // ✅ VERIFY RESET CODE MUTATION
  const verifyResetCodeMutation = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authService.verifyResetCode(email, code),
  });

  // ✅ RESET PASSWORD MUTATION
  const resetPasswordMutation = useMutation({
    mutationFn: ({ verificationToken, newPassword }: { verificationToken: string; newPassword: string }) =>
      authService.resetPassword(verificationToken, newPassword),
  });

  // ✅ RETURN ALL MUTATIONS
  return {
    // State
    user,
    isAuthenticated,
    isLoading,

    // Login
    login: loginMutation.mutateAsync,
    loginLoading: loginMutation.isPending,
    loginError: loginMutation.error,

    // Register - ✅ Now defined
    register: registerMutation.mutateAsync,
    registerLoading: registerMutation.isPending,
    registerError: registerMutation.error,

    // Verify Email
    verifyEmail: verifyEmailMutation.mutateAsync,
    verifyEmailLoading: verifyEmailMutation.isPending,
    verifyEmailError: verifyEmailMutation.error,

    // Resend Verification
    resendVerification: resendVerificationMutation.mutateAsync,
    resendVerificationLoading: resendVerificationMutation.isPending,

    // Forgot Password
    forgotPassword: forgotPasswordMutation.mutateAsync,
    forgotPasswordLoading: forgotPasswordMutation.isPending,

    // Verify Reset Code
    verifyResetCode: verifyResetCodeMutation.mutateAsync,
    verifyResetCodeLoading: verifyResetCodeMutation.isPending,

    // Reset Password
    resetPassword: resetPasswordMutation.mutateAsync,
    resetPasswordLoading: resetPasswordMutation.isPending,

    // Logout
    logout: logoutMutation.mutateAsync,
    logoutLoading: logoutMutation.isPending,

    // Logout All
    logoutAll: logoutAllMutation.mutateAsync,
    logoutAllLoading: logoutAllMutation.isPending,
  };
}

export { AuthError };