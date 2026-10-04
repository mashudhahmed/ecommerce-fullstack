// app/checkout/page.tsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/hooks/useCart';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import {
  ArrowLeft,
  ShoppingBag,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  LayoutDashboard,
  MapPin,
  Store,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';

function CheckoutItemRow({ item }: { item: any }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = useMemo(() => {
    if (!item?.product?.imageUrl || imageError) {
      return '/placeholder-image.png';
    }
    return item.product.imageUrl;
  }, [item?.product?.imageUrl, imageError]);

  if (!item?.product) return null;

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted/20">
          <Image
            src={imageSrc}
            alt={item.product.title || 'Product'}
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
        <p className="font-bold tabular-nums">
          {formatPrice((item.product.price || 0) * item.quantity)}
        </p>
      </div>
      <Separator className="mt-4" />
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, totalPrice, clearCart, isLoading: cartLoading } = useCart();
  const { createOrder, isCreatingOrder } = useOrders();

  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [shippingAddress, setShippingAddress] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const isOrderPlacedRef = useRef(false);

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [authLoading, isAuthenticated, router]);

  // Redirect to cart if cart is empty (only if NOT currently placing an order and NOT admin)
  useEffect(() => {
    if (!cartLoading && items.length === 0 && isAuthenticated && !isOrderPlacedRef.current && !isAdminOrSuperAdmin) {
      router.push('/cart');
    }
  }, [cartLoading, items.length, isAuthenticated, isAdminOrSuperAdmin, router]);

  const handlePlaceOrder = async () => {
    if (items.length === 0 || isPlacing || isCreatingOrder) return;

    // Filter only valid items with valid IDs
    const validOrderItems = items
      .filter((item) => item?.product?.id && item.quantity > 0)
      .map((item) => ({
        productId: Number(item.product.id),
        quantity: Number(item.quantity),
      }));

    if (validOrderItems.length === 0) {
      toast.error('No valid products in your cart to order.');
      return;
    }

    setIsPlacing(true);
    isOrderPlacedRef.current = true;

    try {
      await createOrder({
        items: validOrderItems,
        shippingAddress: shippingAddress.trim() || undefined,
      });

      // Clear cart silently so it doesn't trigger a separate "Cart cleared" toast
      await clearCart({ silent: true });
      toast.success('Order placed successfully!');

      // Navigate straight to orders page
      router.replace('/orders');
    } catch (error: any) {
      isOrderPlacedRef.current = false;
      setIsPlacing(false);
      // Error toast handled centrally in useOrders hook
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
        <h2 className="text-2xl font-black tracking-tight">Checkout Disabled</h2>
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
          Administrative and operational staff accounts cannot place consumer orders. Please test checkout using a customer account or manage store orders from the staff dashboard.
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

  // If order was just placed, render transition screen while redirecting
  if (isOrderPlacedRef.current || isPlacing) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold">Placing your order…</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirming order items and preparing your receipt.
        </p>
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
  const isBusy = isPlacing || isCreatingOrder;

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
        {/* Left Column: Shipping Address & Order Items */}
        <div className="space-y-6 lg:col-span-2">
          {/* Shipping Address Card */}
          <div className="rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
              <MapPin className="h-5 w-5 text-orange-600" />
              Delivery Address
            </h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="shippingAddress" className="text-sm font-medium">
                  Shipping Address
                </Label>
                <Input
                  id="shippingAddress"
                  placeholder="Street address, City, State, ZIP code"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="mt-1.5"
                  disabled={isBusy}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Delivering to: <span className="font-medium text-foreground">{user?.name}</span> ({user?.email})
              </p>
            </div>
          </div>

          {/* Order Packages Card */}
          <div className="rounded-2xl border border-border p-6 shadow-sm space-y-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <ShoppingBag className="h-5 w-5 text-orange-600" />
                Review Packages ({packages.length} {packages.length === 1 ? 'Package' : 'Packages'})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Items grouped by seller for separate fulfillment and dispatch
              </p>
            </div>

            <div className="space-y-4">
              {packages.map((pkg, idx) => (
                <div
                  key={pkg.sellerId || idx}
                  className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-orange-600" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Package {idx + 1}:
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        Sold by {pkg.sellerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <Truck className="h-3 w-3" />
                      <span>Free Delivery</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {pkg.items.map((item) => (
                      <CheckoutItemRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4 rounded-2xl border border-border p-6 shadow-sm">
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
              <span className="tabular-nums text-orange-600">{formatPrice(total)}</span>
            </div>

            <Button
              className="w-full rounded-full bg-orange-600 text-white hover:bg-orange-700"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={isBusy}
            >
              {isBusy ? (
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
              By placing your order, you agree to our Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}