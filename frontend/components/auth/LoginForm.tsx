// components/auth/LoginForm.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Image from 'next/image';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  Shield,
  Mail,
  Lock,
  ArrowRight,
  Fingerprint,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

// ============================================================
// 2FA INPUT COMPONENT
// ============================================================

const TwoFactorInput = ({
  value,
  onChange,
  onComplete,
  isLoading,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete: () => void;
  isLoading: boolean;
}) => {
  const inputRefs = useMemo(
    () => Array.from({ length: 6 }, () => null) as (HTMLInputElement | null)[],
    []
  );
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const handleChange = (index: number, val: string) => {
    const newValue = val.replace(/\D/g, '');
    if (newValue.length > 1) return;

    const chars = value.split('');
    chars[index] = newValue;
    const result = chars.join('');
    onChange(result);

    if (newValue && index < 5) {
      inputRefs[index + 1]?.focus();
    }

    if (result.length === 6) {
      setTimeout(onComplete, 300);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs[index - 1]?.focus();
    }
    if (e.key === 'Enter' && value.length === 6) {
      onComplete();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '');
    if (paste.length <= 6) {
      const padded = paste.padEnd(6, '');
      onChange(padded);
      if (padded.length === 6) {
        setTimeout(onComplete, 300);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "transition-all duration-200",
              value[index] && "scale-105"
            )}
          >
            <Input
              ref={(el) => { inputRefs[index] = el; }}
              type="text"
              maxLength={1}
              value={value[index] || ''}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              disabled={isLoading}
              className={cn(
                "h-14 w-14 text-center text-2xl font-bold",
                "border-2 transition-all duration-200",
                value[index] && "border-primary bg-primary/5",
                focusedIndex === index && "border-primary ring-2 ring-primary/20",
                "focus-visible:ring-2 focus-visible:ring-primary/30"
              )}
              aria-label={`2FA digit ${index + 1}`}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Enter the 6-digit code from your authenticator app or use a backup code
      </p>
    </div>
  );
};

// ============================================================
// LOGO COMPONENT
// ============================================================

const Logo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center", className)}>
    <div className="relative h-12 w-12">
      <Image
        src="/logo.png"
        alt="SnapCart"
        fill
        className="object-contain"
        priority
      />
    </div>
  </div>
);

// ============================================================
// MAIN LOGIN FORM
// ============================================================

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
  const [rememberMe, setRememberMe] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    if (!isLoading && !loginSuccess && (isAuthenticated || storeState.isAuthenticated)) {
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, storeState.isAuthenticated, loginSuccess, redirectUrl, router]);

  useEffect(() => {
    if (loginSuccess && (isAuthenticated || storeState.isAuthenticated)) {
      window.location.href = redirectUrl;
    }
  }, [isAuthenticated, loginSuccess, redirectUrl, storeState.isAuthenticated]);

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

  // ============================================================
  // FORM
  // ============================================================

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // ============================================================
  // HANDLERS
  // ============================================================

  const onSubmit = useCallback(async (data: LoginInput) => {
    setErrorMessage(null);
    setLoginSuccess(false);
    form.clearErrors();

    try {
      const response = await login(data);
      setLoginSuccess(true);
      const userName = response?.user?.name ?? 'User';
      toast.success(`Welcome back, ${userName}!`);
      
      if (rememberMe) {
        localStorage.setItem('remembered_email', data.email);
      } else {
        localStorage.removeItem('remembered_email');
      }

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    } catch (error: any) {
      const isExpected = error instanceof AuthError &&
        (error.isUnauthorized() || error.isRateLimited() || error.isValidationError());

      if (isExpected) {
        console.log('Login failed (expected):', error.message);
      } else {
        console.error('Login error:', error);
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
          const retryAfter = error?.retryAfter || 30;
          message = `Too many login attempts. Please wait ${retryAfter} seconds.`;
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
  }, [login, form, redirectUrl, rememberMe, router]);

  const handleVerifyTwoFactor = useCallback(async () => {
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      toast.error('Please enter a valid 6-digit 2FA code.');
      return;
    }
    
    setIsOtpLoading(true);
    try {
      await verifyTwoFactor(twoFactorToken);
    } catch (error: any) {
      // Error handled in hook
    } finally {
      setIsOtpLoading(false);
    }
  }, [twoFactorToken, verifyTwoFactor]);

  const handleResendCode = useCallback(async () => {
    toast.success('New verification code sent to your email.');
  }, []);

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (isLoading || (!loginSuccess && (isAuthenticated || storeState.isAuthenticated))) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // 2FA STATE
  // ============================================================

  if (twoFactorRequired) {
    return (
      <div className="w-full max-w-md mx-auto animate-fade-in-up">
        <Card className="shadow-xl border-primary/10">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="relative h-16 w-16">
                <Image
                  src="/logo.png"
                  alt="SnapCart"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
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
          <CardContent className="space-y-6">
            <TwoFactorInput
              value={twoFactorToken}
              onChange={setTwoFactorToken}
              onComplete={handleVerifyTwoFactor}
              isLoading={verifyTwoFactorLoading || isOtpLoading}
            />
            
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleVerifyTwoFactor}
              disabled={verifyTwoFactorLoading || isOtpLoading || twoFactorToken.length !== 6}
            >
              {(verifyTwoFactorLoading || isOtpLoading) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4" />
                  Verify & Login
                </>
              )}
            </Button>

            <div className="text-center space-y-3">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={handleResendCode}
              >
                Didn't receive a code? Resend
              </button>
              <div>
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
                  Back to login
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // STANDARD LOGIN FORM
  // ============================================================

  const isDisabled = loginLoading || loginSuccess;

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in-up">
      <Card className="shadow-xl border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="relative h-16 w-16">
              <Image
                src="/logo.png"
                alt="SnapCart"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold">
            Welcome Back
          </CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 border border-red-200 dark:border-red-800 animate-fade-in"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="john@example.com"
                          type="email"
                          disabled={isDisabled}
                          autoComplete="email"
                          className="pl-10"
                          {...field}
                        />
                      </div>
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
                    <FormLabel className="font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          disabled={isDisabled}
                          className="pl-10 pr-12"
                          autoComplete="current-password"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isDisabled}
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
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

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 transition-colors"
                  />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full gap-2 group"
                disabled={isDisabled}
                size="lg"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {loginSuccess ? 'Redirecting...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium transition-colors"
            >
              Create one
            </Link>
          </p>
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1 gap-2" type="button">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button variant="outline" className="flex-1 gap-2" type="button">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}