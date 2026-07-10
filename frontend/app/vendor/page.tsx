// app/vendor/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VendorPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to vendor dashboard
    router.replace('/vendor/dashboard');
  }, [router]);

  return null;
}