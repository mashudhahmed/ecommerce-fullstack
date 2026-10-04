// app/wishlist/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, Trash2, Info, ShieldAlert, LayoutDashboard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function WishlistPage() {
  const { wishlist, isLoading, total, clearWishlist, clearLoading } = useWishlist();
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdminOrSuperAdmin = mounted && (user?.role === 'admin' || user?.role === 'superadmin');

  if (isAdminOrSuperAdmin) {
    const dashboardHref = user?.role === 'superadmin' ? '/superadmin' : '/admin';
    return (
      <div className="mx-auto max-w-md py-20 px-4 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3">
          Administrative Account
        </div>
        <h2 className="text-2xl font-black tracking-tight">Wishlist Disabled</h2>
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
          Administrative staff accounts do not hold personal wishlists. You can inspect product listings or manage products directly from the admin console.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            className="w-full sm:w-auto rounded-full bg-zinc-950 text-white hover:bg-zinc-800 gap-2 cursor-pointer"
            asChild
          >
            <Link href={dashboardHref}>
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto rounded-full gap-2 cursor-pointer"
            asChild
          >
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
              Browse Catalog
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-semibold">Your wishlist is empty</h2>
        <p className="text-muted-foreground mt-2">
          Save your favorite items by clicking the heart icon on any product.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/products">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Browse Products
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground">{total} {total === 1 ? 'item' : 'items'} saved</p>
        </div>
        {wishlist.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => clearWishlist()}
            disabled={clearLoading}
            className="cursor-pointer self-start sm:self-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {mounted && !isAuthenticated && (
        <div className="flex items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50/80 p-3.5 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
          <Info className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <p className="flex-1">
            You are viewing your saved items on this device.{' '}
            <Link href="/login?redirect=/wishlist" className="font-medium underline hover:text-orange-950">
              Sign in
            </Link>{' '}
            to sync them across your phone, tablet, and computer.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishlist.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}