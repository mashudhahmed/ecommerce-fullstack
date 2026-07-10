// components/auth/LoginForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, AlertCircle, Shield } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/validations/schemas';
import { useAuth, AuthError } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    login,
    loginLoading,
    isAuthenticated,
    isLoading,
    twoFactorRequired,
    setTwoFactorRequired,
    pendingLoginEmail,
    setPendingLoginEmail,
    pendingLoginPassword,
    setPendingLoginPassword,
    verifyTwoFactor,
    verifyTwoFactorLoading,
  } = useAuth();
  const storeState = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');

  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && !loginSuccess && (isAuthenticated || storeState.isAuthenticated)) {
      console.log('🔄 Already authenticated, redirecting away from /login');
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, storeState.isAuthenticated, loginSuccess, redirectUrl, router]);

  useEffect(() => {
    if (loginSuccess && (isAuthenticated || storeState.isAuthenticated)) {
      console.log('✅ Redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
    }
  }, [isAuthenticated, loginSuccess, redirectUrl, storeState.isAuthenticated]);

  // Handle query params
  useEffect(() => {
    const sessionExpired = searchParams.get('session');
    const verification = searchParams.get('verification');
    const registered = searchParams.get('registered');

    if (sessionExpired === 'expired') {
      toast.warning('Your session has expired. Please login again.');
    }
    if (verification) {
      toast.info('Please verify your email to access all features.');
    }
    if (registered) {
      toast.success('Account created successfully! Please login.');
    }
  }, [searchParams]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setErrorMessage(null);
    setLoginSuccess(false);
    form.clearErrors();

    try {
      console.log('📤 Logging in:', data.email);
      const response = await login(data);
      console.log('✅ Login successful:', response);
      setLoginSuccess(true);
      const userName = response?.user?.name ?? 'User';
      toast.success(`Welcome back, ${userName}!`);
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    } catch (error: any) {
      const isExpected =
        error instanceof AuthError &&
        (error.isUnauthorized() || error.isRateLimited() || error.isValidationError());

      if (isExpected) {
        console.log('ℹ️ Login failed (expected):', error.message);
      } else {
        console.error('❌ Login error:', error);
      }

      let message = 'An unexpected error occurred. Please try again.';

      if (error instanceof AuthError) {
        message = error.getDisplayMessage();

        if (error.statusCode === 401) {
          message = 'Invalid email or password. Please try again.';
          form.setFocus('password');
          form.setError('password', {
            type: 'manual',
            message: 'Invalid email or password',
          });
        } else if (error.statusCode === 429) {
          message = 'Too many login attempts. Please wait 30 seconds.';
        } else if (error.statusCode === 0) {
          message = 'Network error. Please check your connection.';
        } else if (error.statusCode >= 500) {
          message = 'Server error. Please try again later.';
        } else if (message.toLowerCase().includes('verify')) {
          message = 'Please verify your email before logging in.';
          setTimeout(() => {
            router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
          }, 2000);
        }
      }

      setErrorMessage(message);
      toast.error(message);
    }
  };

  // ============================================================
  // 2FA VERIFICATION HANDLER
  // ============================================================

  const handleVerifyTwoFactor = async () => {
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      toast.error('Please enter a valid 6-digit 2FA code.');
      return;
    }
    try {
      await verifyTwoFactor(twoFactorToken);
      // On success, the hook will update the store and redirect.
    } catch (error: any) {
      // Error handled in hook
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  const isDisabled = loginLoading || loginSuccess;

  // Loading state
  if (isLoading || (!loginSuccess && (isAuthenticated || storeState.isAuthenticated))) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 2FA Step
  if (twoFactorRequired) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
            {pendingLoginEmail && (
              <span className="block text-sm mt-1 text-muted-foreground">
                for <strong>{pendingLoginEmail}</strong>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Authentication Code</label>
              <Input
                type="text"
                placeholder="123456"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyTwoFactor();
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the 6-digit code from Google Authenticator, Authy, or your backup code.
              </p>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleVerifyTwoFactor}
              disabled={verifyTwoFactorLoading || twoFactorToken.length !== 6}
            >
              {verifyTwoFactorLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Login'
              )}
            </Button>
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => {
                  setTwoFactorRequired(false);
                  setTwoFactorToken('');
                  setPendingLoginEmail(null);
                  setPendingLoginPassword(null);
                }}
              >
                ← Back to login
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Standard Login Form
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {errorMessage && (
              <div role="alert" className="rounded-md bg-red-50 p-3 border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="john@example.com"
                      type="email"
                      disabled={isDisabled}
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        disabled={isDisabled}
                        className="pr-10"
                        autoComplete="current-password"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isDisabled}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm text-right">
              <Link href="/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isDisabled} size="lg">
              {loginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {loginSuccess ? 'Redirecting...' : 'Signing in...'}
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-center border-t pt-6">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}