import { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

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
    <div className="flex w-full items-center justify-center">
      <RegisterForm />
    </div>
  );
}