// app/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | SnapCart',
  description: 'Sign in to your SnapCart account',
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-200px)] items-center justify-center overflow-hidden py-12">
      {/* Subtle brand backdrop — a soft radial glow behind the card
          instead of a flat background, no JS required so this stays
          a server component. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(600px circle at 50% 0%, rgba(234,88,12,0.06), transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div className="w-full px-4">
        <LoginForm />
      </div>
    </div>
  );
}