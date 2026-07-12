// frontend/components/auth/ResetPasswordForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { resetPasswordSchema, type ResetPasswordInput } from '@/validations/schemas';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, Mail, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

interface CodeFormData {
  code: string;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyResetCode, resetPassword, forgotPassword } = useAuth();
  
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [verificationToken, setVerificationToken] = useState('');
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // ✅ State for code input (not using react-hook-form)
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ✅ Get email from URL or localStorage
  useEffect(() => {
    console.log('🔍 ResetPasswordForm: Looking for email...');
    
    let emailParam = searchParams.get('email');
    console.log('📧 Email from URL:', emailParam);
    
    if (!emailParam) {
      const storedEmail = localStorage.getItem('reset_email');
      console.log('📧 Email from localStorage:', storedEmail);
      if (storedEmail) {
        emailParam = storedEmail;
      }
    }

    if (emailParam) {
      console.log('✅ Email found:', emailParam);
      setEmail(emailParam);
      setMaskedEmail(maskEmail(emailParam));
      setIsInitialized(true);
      localStorage.setItem('reset_email', emailParam);
    } else {
      console.log('❌ No email found');
      setIsInitialized(true);
      
      if (!redirectAttempted) {
        setRedirectAttempted(true);
        toast.error('Please enter your email address first.');
        setTimeout(() => {
          router.push('/forgot-password');
        }, 500);
      }
    }
  }, [searchParams, router, redirectAttempted]);

  const maskEmail = (email: string): string => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    if (localPart.length <= 2) return email;
    const masked = localPart.slice(0, 2) + '***' + localPart.slice(-2);
    return `${masked}@${domain}`;
  };

  // ✅ Handle code verification (without react-hook-form)
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Email is required. Please go back.');
      router.push('/forgot-password');
      return;
    }

    if (!code || code.length !== 6) {
      toast.error('Please enter a valid 6-digit code.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔑 Verifying code for:', email);
      
      const result = await verifyResetCode({ email, code });
      
      console.log('✅ Code verified');
      setVerificationToken(result.verificationToken);
      setStep('password');
      toast.success('Code verified successfully!');
      setCode('');
      
    } catch (error: any) {
      console.error('❌ Verification error:', error);
      toast.error(error?.response?.data?.message || 'Invalid or expired code.');
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Handle password reset (without react-hook-form)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔐 Resetting password...');
      
      await resetPassword({
        verificationToken,
        newPassword,
      });
      
      console.log('✅ Password reset successfully');
      toast.success('Password reset successfully!');
      localStorage.removeItem('reset_email');
      
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Reset error:', error);
      toast.error(error?.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Email is required.');
      router.push('/forgot-password');
      return;
    }

    if (resendCooldown > 0) return;

    setIsResending(true);
    setResendCooldown(60);
    
    try {
      console.log('📧 Resending code to:', email);
      await forgotPassword(email);
      toast.success('New code sent to your email!');
      
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('❌ Resend error:', error);
      toast.error('Failed to resend code. Please try again.');
      setResendCooldown(0);
    } finally {
      setIsResending(false);
    }
  };

  const handleGoBack = () => {
    localStorage.removeItem('reset_email');
    router.push('/forgot-password');
  };

  // ✅ Loading state
  if (!isInitialized) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  // ✅ No email state
  if (!email) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No email found. Please try again.</p>
          <Button 
            className="mt-4"
            onClick={() => router.push('/forgot-password')}
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // STEP 1: CODE VERIFICATION
  // ============================================================

  if (step === 'code') {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-orange-100">
        <CardHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="rounded-full bg-orange-100 p-3">
              <Mail className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Enter Reset Code</CardTitle>
          <CardDescription className="text-center">
            Enter the 6-digit code sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ✅ Show masked email - NOT EDITABLE */}
          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">We sent a code to:</p>
              <p className="font-medium text-foreground mt-1">{maskedEmail}</p>
            </div>
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={handleGoBack}
                className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 hover:underline transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Wrong email? Go back
              </button>
            </div>
          </div>

          {/* ✅ Simple form without react-hook-form */}
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Code</label>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setCode(value);
                }}
                className="text-center text-2xl tracking-widest"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700" 
              disabled={isLoading || isResending || code.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className="text-sm text-orange-600 hover:underline disabled:text-muted-foreground disabled:no-underline transition-colors"
              >
                {isResending ? (
                  'Sending...'
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  "Didn't receive code? Resend"
                )}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // STEP 2: PASSWORD RESET
  // ============================================================

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-green-100">
      <CardHeader>
        <div className="flex items-center justify-center mb-2">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
        <CardDescription className="text-center">
          Enter your new password for {maskedEmail}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Password must contain at least 8 characters, including uppercase,
            lowercase, number, and special character.
          </AlertDescription>
        </Alert>
        
        {/* ✅ Simple form without react-hook-form */}
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm Password</label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-500">Passwords do not match</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700" 
              disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('code')}
              className="w-full"
              disabled={isLoading}
            >
              Back to Code Entry
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}