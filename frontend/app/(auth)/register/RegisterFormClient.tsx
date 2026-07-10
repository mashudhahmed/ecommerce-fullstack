// app/(auth)/register/RegisterFormClient.tsx
'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// ✅ Dynamic import with ssr: false in Client Component
const RegisterForm = dynamic(
  () => import('@/components/auth/RegisterForm').then((mod) => mod.RegisterForm),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-md mx-auto space-y-4">
        <Skeleton className="h-12 w-32 mx-auto" />
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    ),
  }
);

export default function RegisterFormClient() {
  return <RegisterForm />;
}