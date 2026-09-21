'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

/**
 * Intelligent redirect for /dashboard:
 * - Vendors -> /vendor/dashboard
 * - Admins -> /admin
 * - Superadmins -> /superadmin
 * - Customers -> /orders (Amazon-style account navigation)
 * - Guests -> /login
 */
export default function DashboardRedirectPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    switch (user?.role) {
      case 'vendor':
        router.replace('/vendor/dashboard');
        break;
      case 'admin':
        router.replace('/admin');
        break;
      case 'superadmin':
        router.replace('/superadmin');
        break;
      default:
        // Regular customers go directly to home page (Amazon / Alibaba standard)
        router.replace('/');
        break;
    }
  }, [user, isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        <p className="text-sm text-muted-foreground">Redirecting to your account…</p>
      </div>
    </div>
  );
}