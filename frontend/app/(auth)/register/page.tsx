// app/(auth)/register/page.tsx
import { Metadata } from 'next';
import { RegisterTabs } from '@/components/auth/RegisterTabs';

export const metadata: Metadata = {
  title: 'Create Account | SnapCart',
  description: 'Join SnapCart – Create your account to start shopping',
};

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-8 px-4">
      <RegisterTabs />
    </div>
  );
}