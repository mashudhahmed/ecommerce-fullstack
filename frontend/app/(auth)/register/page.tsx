// app/(auth)/register/page.tsx
import { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import RegisterFormClient from './RegisterFormClient';

export const metadata: Metadata = {
  title: 'Create Account | SnapCart',
  description: 'Join SnapCart – Create your account to start shopping',
  openGraph: {
    title: 'Create Account | SnapCart',
    description: 'Join SnapCart – Create your account to start shopping',
    type: 'website',
    url: '/register',
  },
};

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-8 px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md mx-auto space-y-4">
            <Skeleton className="h-12 w-32 mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        }
      >
        <RegisterFormClient />
      </Suspense>
    </div>
  );
}