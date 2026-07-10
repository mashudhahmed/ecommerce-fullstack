// app/layout.tsx
import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css'
import { Providers } from '@/components/shared/Providers';
import { cn } from "@/lib/utils";
import ClientLayout from './ClientLayout';
import { generateMetadata } from '@/lib/seo';
import { Suspense } from 'react';
import Loading from './loading';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const inter = Inter({ subsets: ['latin'] });

// ✅ Generate metadata using utility
export const metadata: Metadata = generateMetadata({
  title: 'Home',
  description: 'Shop the best products at SnapCart - Your one-stop e-commerce destination',
  url: '/',
  type: 'website',
  keywords: ['ecommerce', 'shop', 'products', 'snapcart', 'online shopping'],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {/* ✅ Preload critical fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <Providers>
          <Suspense fallback={<Loading />}>
            <ClientLayout>{children}</ClientLayout>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}