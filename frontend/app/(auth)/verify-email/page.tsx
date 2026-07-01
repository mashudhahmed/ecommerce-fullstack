import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm';
import { Suspense } from 'react';

export const metadata = {
  title: 'Verify Email | E-Commerce Store',
  description: 'Verify your email address',
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}