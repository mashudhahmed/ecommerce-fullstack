// frontend/app/(auth)/forgot-password/page.tsx
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | SnapCart',
  description: 'Reset your password',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
      <ForgotPasswordForm />
    </div>
  );
}