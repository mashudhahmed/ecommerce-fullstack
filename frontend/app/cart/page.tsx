// app/cart/page.tsx
'use client';

import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/components/cart/CartItem';
import { formatPrice } from '@/lib/utils';
import {
  ShoppingBag,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  LayoutDashboard,
  ArrowLeft,
  Store,
  Package,
  Truck,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, totalPrice, totalItems, isLoading } = useCart();
  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Group items by vendor into multi-vendor packages
  const packages = useMemo(() => {
    const map = new Map<
      string,
      {
        sellerName: string;
        sellerId?: number;
        items: typeof items;
      }
    >();

    items?.forEach((item) => {
      const sellerId = item.product?.owner?.id;
      const key = sellerId ? String(sellerId) : 'official';
      const sellerName =
        item.product?.owner?.vendorBusinessName ||
        item.product?.owner?.name ||
        'SnapCart Official Store';

      if (!map.has(key)) {
        map.set(key, { sellerName, sellerId, items: [] });
      }
      map.get(key)!.items.push(item);
    });

    return Array.from(map.values());
  }, [items]);

  if (authLoading || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        <h2 className="text-2xl font-black tracking-tight">Staff Preview Mode</h2>
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
          Consumer purchasing and personal shopping carts are disabled for administrative accounts. You can inspect store products in catalog mode or manage store inventory from the dashboard.
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

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-sm py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
          <ShoppingBag className="h-7 w-7 text-orange-600" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Your cart is empty</h2>
        <p className="mt-2 text-muted-foreground">
          Browse our products and add items to your cart.
        </p>
        <Button
          className="mt-6 rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
          onClick={() => router.push('/products')}
        >
          Continue shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Shopping Cart</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalItems} {totalItems === 1 ? 'item' : 'items'} across {packages.length}{' '}
            {packages.length === 1 ? 'seller package' : 'seller packages'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {packages.map((pkg, idx) => (
            <div
              key={pkg.sellerId || idx}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4"
            >
              {/* Package Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Package {idx + 1} of {packages.length}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm font-bold text-foreground">
                        Sold by {pkg.sellerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Truck className="h-3 w-3 text-emerald-600" />
                      <span>Free Standard Delivery • Est. 2–4 Business Days</span>
                    </div>
                  </div>
                </div>

                {pkg.sellerId && (
                  <Link href={`/stores/${pkg.sellerId}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full gap-1">
                      Store <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>

              {/* Items in this Package */}
              <div className="space-y-3">
                {pkg.items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4 rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold tracking-tight">Order summary</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                <span className="font-medium tabular-nums">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-emerald-600">Free</span>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            <Button
              className="w-full rounded-full bg-orange-600 text-white hover:bg-orange-700"
              size="lg"
              onClick={() => router.push('/checkout')}
            >
              Proceed to checkout
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure checkout, protected purchase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}