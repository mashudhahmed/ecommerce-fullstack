// frontend/components/auth/ForgotPasswordForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
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
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const { forgotPassword } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      setIsLoading(true);
      
      // ✅ 1. Store email in localStorage FIRST
      localStorage.setItem('reset_email', data.email);
      localStorage.setItem('reset_email_timestamp', Date.now().toString());
      
      // ✅ 2. Send the email
      await forgotPassword(data.email);
      
      // ✅ 3. Update state
      setSubmittedEmail(data.email);
      setIsSuccess(true);
      toast.success('Reset code sent to your email!');
      
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      toast.error(error?.response?.data?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Success state - User stays on this page until they click "Enter Code"
  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Check Your Email</CardTitle>
          <CardDescription className="text-center">
            We've sent a password reset code to your email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Code sent to:</p>
              <p className="font-medium text-foreground">{submittedEmail}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please check your inbox and spam folder.
              The code will expire in 15 minutes.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={() => {
              // ✅ Navigate to reset password with email in URL
              router.push(`/reset-password?email=${encodeURIComponent(submittedEmail)}`);
            }}
          >
            Enter Reset Code
          </Button>
          <button
            type="button"
            onClick={() => {
              setIsSuccess(false);
              setSubmittedEmail('');
              form.reset();
              localStorage.removeItem('reset_email');
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Use a different email
          </button>
        </CardFooter>
      </Card>
    );
  }

  // ✅ Initial form state
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Forgot Password</CardTitle>
        <CardDescription className="text-center">
          Enter your email to receive a password reset code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="john@example.com" 
                      type="email" 
                      {...field} 
                      disabled={isLoading}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Code'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center border-t pt-6">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  );
}