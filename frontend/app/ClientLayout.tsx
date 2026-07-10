'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { Toaster } from 'sonner';
import { usePathname } from 'next/navigation';
import { SkipToContent } from '@/components/shared/SkipToContent';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // ✅ Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Determine if footer should be shown
  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/superadmin');
  const isVendorRoute = pathname?.startsWith('/vendor');
  const isAuthPage = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'].some(
    (p) => pathname?.startsWith(p)
  );
  const showFooter = !isAdminRoute && !isVendorRoute && !isAuthPage;

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SkipToContent />
      <Header />
      <main id="main-content" className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      {showFooter && <Footer />}
      <Toaster position="top-right" richColors />
    </div>
  );
}