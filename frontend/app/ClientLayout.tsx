'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/shared/Header';
import { AuthHeader } from '@/components/shared/AuthHeader';
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

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdminRoute =
    pathname?.startsWith('/admin') || pathname?.startsWith('/superadmin');
  const isVendorRoute = pathname?.startsWith('/vendor');
  const isAuthPage = [
    '/login',
    '/register',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
    '/two-factor',
  ].some((p) => pathname?.startsWith(p));

  const showFooter = !isAdminRoute && !isVendorRoute && !isAuthPage;

  if (!mounted) {
    return null;
  }

  // Admin & Superadmin / Vendor routes have their own specialized dashboard layout and sidebars
  if (isAdminRoute || isVendorRoute) {
    return (
      <div className="flex min-h-screen flex-col">
        <SkipToContent />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  // Auth pages (Login, Register, etc.) receive a clean, distraction-free AuthHeader (Amazon / Shopify standard)
  if (isAuthPage) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/10">
        <SkipToContent />
        <AuthHeader />
        <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-10">
          {children}
        </main>
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  // Regular Storefront pages (Home, Products, Categories, Cart, Checkout, Orders, Wishlist, Profile)
  return (
    <div className="flex min-h-screen flex-col">
      <SkipToContent />
      <Header />
      <main id="main-content" className="container mx-auto flex-1 px-4 py-8">
        {children}
      </main>
      {showFooter && <Footer />}
      <Toaster position="top-right" richColors />
    </div>
  );
}