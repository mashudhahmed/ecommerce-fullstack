// components/auth/LoginForm.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/validations/schemas';
import { useAuth } from '@/hooks/useAuth';
import { AuthError } from '@/services/auth.service';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const rateLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
    };
  }, []);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const startRateLimitCooldown = () => {
    setIsRateLimited(true);
    setErrorMessage('Too many login attempts. Please wait 30 seconds.');
    if (rateLimitTimeoutRef.current) clearTimeout(rateLimitTimeoutRef.current);
    rateLimitTimeoutRef.current = setTimeout(() => {
      setIsRateLimited(false);
      setErrorMessage(null);
    }, 30000);
  };

  const onSubmit = async (data: LoginInput) => {
    setErrorMessage(null);
    form.clearErrors();

    if (isRateLimited) {
      toast.error('Too many attempts. Please wait 30 seconds.');
      return;
    }

    try {
      const response = await login(data);

      // ✅ response.user is guaranteed to exist
      // ✅ Tokens are stored in HTTP-only cookies automatically
      const userName = response?.user?.name ?? 'User';
      
      toast.success(`Welcome back, ${userName}!`);
      router.push('/dashboard');
    } catch (error: any) {
      if (error instanceof AuthError) {
        const message = error.message || 'Login failed. Please try again.';
        const statusCode = error.statusCode || 500;

        if (statusCode === 401) {
          setErrorMessage(message);
          toast.error(message);
          form.setFocus('password');
          form.setError('password', { type: 'manual', message });
          return;
        }

        if (statusCode === 429) {
          startRateLimitCooldown();
          toast.error('Rate limit exceeded');
          return;
        }

        if (statusCode === 0) {
          setErrorMessage('Network error. Please check your connection.');
          toast.error('Network error');
          return;
        }

        if (statusCode >= 500) {
          setErrorMessage('Server error. Please try again later.');
          toast.error('Server error');
          return;
        }

        setErrorMessage(message);
        toast.error(message);
        return;
      }

      const message = error?.message || 'An unexpected error occurred. Please try again.';
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((v) => !v);

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
                      disabled={loginLoading || isRateLimited}
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
                        disabled={loginLoading || isRateLimited}
                        className="pr-10"
                        autoComplete="current-password"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={togglePasswordVisibility}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        disabled={loginLoading || isRateLimited}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginLoading || isRateLimited} 
              size="lg"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
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