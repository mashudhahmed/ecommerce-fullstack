// app/cart/page.tsx
'use client';

import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/components/cart/CartItem';
import { formatPrice } from '@/lib/utils';
import { ShoppingBag, Loader2, ShieldCheck } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, totalPrice, totalItems, isLoading } = useCart();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/cart');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-black tracking-tight">Shopping cart</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <CartItem key={item.id} item={item} />
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