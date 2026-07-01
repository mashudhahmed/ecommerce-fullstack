'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

const verifyEmailSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { verifyEmail, verifyEmailLoading, resendVerification } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);

  const form = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      code: '',
    },
  });

  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);

  const onSubmit = async (data: VerifyEmailInput) => {
    try {
      await verifyEmail({ email, code: data.code });
      toast.success('Email verified successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Invalid verification code.');
    }
  };

  const handleResend = async () => {
    try {
      setResendLoading(true);
      await resendVerification(email);
      toast.success('New verification code sent to your email.');
    } catch (error: any) {
      toast.error('Failed to resend verification code.');
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) return null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Verify Your Email</CardTitle>
        <CardDescription>
          Enter the 6-digit verification code sent to {email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123456"
                      maxLength={6}
                      className="text-center text-2xl tracking-widest"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={verifyEmailLoading}>
              {verifyEmailLoading ? 'Verifying...' : 'Verify Email'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button
          variant="ghost"
          onClick={handleResend}
          disabled={resendLoading}
          className="text-sm"
        >
          {resendLoading ? 'Sending...' : 'Resend verification code'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Didn't receive the code? Check your spam folder.
        </p>
      </CardFooter>
    </Card>
  );
}