// app/(auth)/two-factor/page.tsx
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Two-Factor Authentication | SnapCart',
  description: 'Secure your account with two-factor authentication',
};

export default function TwoFactorPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-8 px-4">
      <TwoFactorSetup />
    </div>
  );
}