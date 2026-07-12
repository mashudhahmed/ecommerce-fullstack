// app/checkout/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/hooks/useCart';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import { ArrowLeft, ShoppingBag, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

function CheckoutItemRow({ item }: { item: any }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = useMemo(() => {
    if (!item.product.imageUrl || imageError) {
      return '/placeholder-image.png';
    }
    return item.product.imageUrl;
  }, [item.product.imageUrl, imageError]);

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted/20">
          <Image
            src={imageSrc}
            alt={item.product.title}
            fill
            className="object-cover"
            sizes="56px"
            onError={() => setImageError(true)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{item.product.title}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatPrice(item.product.price)} × {item.quantity}
          </p>
        </div>
        <p className="font-bold tabular-nums">{formatPrice(item.subtotal)}</p>
      </div>
      <Separator className="mt-4" />
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, totalPrice, clearCart, isLoading: cartLoading } = useCart();
  const { createOrder, isCreatingOrder } = useOrders();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!cartLoading && items.length === 0 && isAuthenticated) {
      router.push('/cart');
    }
  }, [cartLoading, items.length, isAuthenticated, router]);

  const handlePlaceOrder = async () => {
    try {
      const orderItems = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      await createOrder({ items: orderItems });
      clearCart();
      toast.success('Order placed successfully!');
      router.push('/orders');
    } catch (error: any) {
      if (error?.statusCode === 429) {
        const retryAfter = error?.retryAfter || 60;
        toast.error(`Too many orders. Please wait ${retryAfter} seconds.`);
        return;
      }
      toast.error(error?.message || 'Failed to place order');
    }
  };

  if (authLoading || cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const subtotal = totalPrice;
  const shipping = subtotal > 50 ? 0 : 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/cart"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to cart
      </Link>

      <h1 className="mb-8 text-3xl font-black tracking-tight">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold tracking-tight">
              <ShoppingBag className="h-5 w-5 text-orange-600" />
              Order items ({items.length})
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <CheckoutItemRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4 rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold tracking-tight">Order summary</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className={shipping === 0 ? 'font-medium text-emerald-600' : 'font-medium tabular-nums'}>
                  {shipping === 0 ? 'Free' : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span className="font-medium tabular-nums">{formatPrice(tax)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>

            <Button
              className="w-full rounded-full bg-orange-600 text-white hover:bg-orange-700"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={isCreatingOrder}
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing order…
                </>
              ) : (
                `Place order · ${formatPrice(total)}`
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              By placing your order, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}