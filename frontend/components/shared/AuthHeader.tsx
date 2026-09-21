// components/shared/AuthHeader.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Minimalist, distraction-free header for authentication pages
 * (Login, Register, Email Verification, Password Reset).
 *
 * Modeled after Amazon, Apple, and Shopify production standards:
 * - No search bar (eliminates cognitive clutter during auth)
 * - No cart or wishlist controls
 * - Direct brand identity + quick return link to the storefront
 */
export function AuthHeader() {
  return (
    <header className="w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="SnapCart Home"
        >
          <div className="relative h-8 w-8 shrink-0">
            <Image
              src="/logo.png"
              alt="SnapCart"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl font-black tracking-tight text-foreground transition-colors duration-200 group-hover:text-orange-600">
            SnapCart
          </span>
        </Link>

        {/* Right side: Security indicator & Return to store link */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">Secure Connection</span>
          </div>

          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to store</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
