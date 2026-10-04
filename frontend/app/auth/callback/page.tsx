'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { authService } from '@/services/auth.service';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setAuthenticated, setLoading } = useAuthStore();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const token = searchParams.get('token');
    const redirect = searchParams.get('redirect') || '/';

    async function handleAuth() {
      if (token) {
        localStorage.setItem('access_token', token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        try {
          const user = await authService.getCurrentUser();
          if (user) {
            setUser(user);
            setAuthenticated(true);
            setLoading(false);
            toast.success(`Welcome back, ${user.name}!`);

            const target =
              redirect && redirect.startsWith('/') && !redirect.startsWith('//')
                ? redirect
                : user.role === 'vendor'
                ? '/vendor/dashboard'
                : user.role === 'admin' || user.role === 'superadmin'
                ? '/admin'
                : '/';

            router.replace(target);
            return;
          }
        } catch (err) {
          console.error('Failed to fetch user after OAuth:', err);
        }
      }

      // Fallback: check if session cookie is already active
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setUser(user);
          setAuthenticated(true);
          setLoading(false);
          toast.success(`Welcome back, ${user.name}!`);
          router.replace(redirect);
          return;
        }
      } catch (err) {
        console.error('Cookie fallback failed:', err);
      }

      setLoading(false);
      toast.error('Google sign-in could not be completed. Please try again.');
      router.replace('/login');
    }

    handleAuth();
  }, [searchParams, router, setUser, setAuthenticated, setLoading]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
      <p className="text-base font-medium text-foreground">Completing Google sign-in…</p>
      <p className="text-sm text-muted-foreground">Please wait while we set up your session.</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
          <p className="text-sm text-muted-foreground">Loading session…</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
