// components/auth/RegisterForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@/validations/schemas';
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
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function RegisterForm() {
  const router = useRouter();
  const { register, registerLoading, registerError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    form.clearErrors();

    try {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
      };

      const result = await register(payload);
      setEmail(data.email);
      setSuccessMessage(result.message || 'Registration successful!');
      toast.success(result.message || 'Registration successful!');

      setTimeout(() => {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      }, 2000);
    } catch (error: any) {
      let message = 'Registration failed. Please try again.';
      let isConflict = false;
      let validationErrors = null;

      if (error instanceof AuthError) {
        message = error.getDisplayMessage();
        if (error.isConflict()) isConflict = true;
        if (error.isValidationError()) validationErrors = error.errors;
      } else if (error?.message) {
        message = error.message;
      }

      if (message.toLowerCase().includes('already registered') || isConflict) {
        setErrorMessage('This email is already registered. Please login instead.');
        toast.error('Email already exists');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      if (validationErrors) {
        const errorMessages = Object.entries(validationErrors)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        setErrorMessage(errorMessages);
        toast.error('Please check your input');
        return;
      }

      setErrorMessage(message);
      toast.error(message);
    }
  };

  if (successMessage) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold">Registration Successful!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Please check your email to verify your account
          </p>
        </div>
        <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Verification Email Sent</AlertTitle>
          <AlertDescription>
            We've sent a verification code to <strong>{email}</strong>.
            Please check your inbox and spam folder.
          </AlertDescription>
        </Alert>
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email?
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <p className="text-sm text-muted-foreground text-center">
          Sign up to start shopping
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="whitespace-pre-line text-sm">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      disabled={registerLoading}
                      autoComplete="name"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="john@example.com"
                      type="email"
                      disabled={registerLoading}
                      autoComplete="email"
                      className="h-10"
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
                  <FormLabel className="text-sm font-medium">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        disabled={registerLoading}
                        className="h-10 pr-10"
                        autoComplete="new-password"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
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

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        disabled={registerLoading}
                        className="h-10 pr-10"
                        autoComplete="new-password"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
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

            <Button
              type="submit"
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              disabled={registerLoading}
            >
              {registerLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-6">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-orange-500 hover:text-orange-600 font-medium hover:underline">
            Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}