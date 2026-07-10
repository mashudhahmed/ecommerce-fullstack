// app/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | SnapCart',
  description: 'Sign in to your SnapCart account',
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
      <LoginForm />
    </div>
  );
}