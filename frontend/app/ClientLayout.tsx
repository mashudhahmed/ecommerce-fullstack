'use client';

import { Header } from '@/components/shared/Header';
import { AuthHeader } from '@/components/shared/AuthHeader';
import { Footer } from '@/components/shared/Footer';
import { usePathname } from 'next/navigation';
import { SkipToContent } from '@/components/shared/SkipToContent';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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

  // Admin & Superadmin / Vendor routes have their own specialized dashboard layout and sidebars
  if (isAdminRoute || isVendorRoute) {
    return (
      <div className="flex min-h-screen flex-col">
        <SkipToContent />
        <main id="main-content" className="flex-1">
          {children}
        </main>
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
      </div>
    );
  }

  // Regular Storefront pages (Home, Products, Categories, Cart, Checkout, Orders, Wishlist, Profile)
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <SkipToContent />
      <Header />
      <main id="main-content" className="container mx-auto flex-1 px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}