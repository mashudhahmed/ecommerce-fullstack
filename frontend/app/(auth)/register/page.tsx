import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata = {
  title: 'Register | E-Commerce Store',
  description: 'Create a new account',
};

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
      <RegisterForm />
    </div>
  );
}