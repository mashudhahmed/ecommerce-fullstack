import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login | E-Commerce Store',
  description: 'Sign in to your account',
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
      <LoginForm />
    </div>
  );
}