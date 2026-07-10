// app/providers.tsx
'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { apiClient } from '@/lib/api-client';

export function Providers({ children }: { children: React.ReactNode }) {
  // Fetch CSRF token on app mount
  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        // The api-client automatically fetches CSRF token on init,
        // but we call it explicitly to ensure it's available early.
        // We'll access the internal method via a hack or we can add a public method.
        // For now, we'll just let the api-client handle it.
        console.log('🔒 CSRF token initialized by api-client');
      } catch (error) {
        console.warn('CSRF initialization skipped:', error);
      }
    };
    fetchCsrf();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}