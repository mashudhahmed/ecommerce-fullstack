// app/checkout/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import { ArrowLeft, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, totalPrice, clearCart, isLoading: cartLoading } = useCart();
  const { createOrder, isCreatingOrder } = useOrders();

  // ✅ Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [authLoading, isAuthenticated, router]);

  // ✅ Redirect if cart is empty
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
      // ✅ Handle rate limiting
      if (error?.statusCode === 429) {
        const retryAfter = error?.retryAfter || 60;
        toast.error(`Too many orders. Please wait ${retryAfter} seconds.`);
        return;
      }
      toast.error(error?.message || 'Failed to place order');
    }
  };

  // ✅ Loading state
  if (authLoading || cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // ✅ Redirect if cart is empty (after loading)
  if (items.length === 0) {
    return null;
  }

  // ✅ Calculate subtotal and tax (example)
  const subtotal = totalPrice;
  const shipping = subtotal > 50 ? 0 : 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        href="/cart"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Cart
      </Link>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Order Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id}>
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-semibold">{item.product.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.product.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.subtotal)}</p>
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (8%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isCreatingOrder}
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  `Place Order • ${formatPrice(total)}`
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By placing your order, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}