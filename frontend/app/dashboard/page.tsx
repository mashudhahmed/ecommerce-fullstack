'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { useProducts } from '@/hooks/useProducts';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { ProductCard } from '@/components/products/ProductCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDate, getInitials, cn } from '@/lib/utils';
import {
  ShoppingBag,
  Heart,
  ShoppingCart,
  User,
  Package,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  LifeBuoy,
  Loader2,
  Compass,
} from 'lucide-react';
import type { Order } from '@/types';

// ============================================================
// CUSTOMER HUB & ROLE-AWARE DASHBOARD
// ============================================================

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { orders: rawOrders, isLoading: ordersLoading } = useOrders();
  const { count: wishlistCount } = useWishlist();
  const { totalItems: cartCount } = useCart();
  const { products } = useProducts();

  // Role routing: Staff & Vendors are automatically routed to their specialized consoles
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace('/login?redirect=/dashboard');
      return;
    }

    if (user?.role === 'vendor') {
      router.replace('/vendor/dashboard');
    } else if (user?.role === 'admin') {
      router.replace('/admin');
    } else if (user?.role === 'superadmin') {
      router.replace('/superadmin');
    }
  }, [user, isAuthenticated, authLoading, router]);

  // Defensive normalization for orders
  const orders = useMemo<Order[]>(() => {
    if (Array.isArray(rawOrders)) return rawOrders;
    if (rawOrders && Array.isArray((rawOrders as any).data)) return (rawOrders as any).data;
    if (rawOrders && Array.isArray((rawOrders as any).items)) return (rawOrders as any).items;
    return [];
  }, [rawOrders]);

  // Active in-transit orders
  const activeOrders = useMemo(() => {
    return orders.filter((o) =>
      ['pending', 'processing', 'shipped'].includes((o.status || '').toLowerCase())
    );
  }, [orders]);

  // Recent 3 orders
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [orders]);

  // Recommended products (top 4)
  const recommendedProducts = useMemo(() => {
    return (products || []).slice(0, 4);
  }, [products]);

  // Show loading while auth checks or if staff redirecting
  if (authLoading || (user?.role && user.role !== 'customer' && user.role !== 'user')) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <p className="text-sm text-muted-foreground">Loading your account hub…</p>
        </div>
      </div>
    );
  }

  const customerName = user?.name || 'Valued Shopper';
  const customerEmail = user?.email || '';
  const initials = getInitials(customerName);

  return (
    <div className="container mx-auto space-y-10 py-6 px-4 sm:px-6">
      {/* ============================================================ */}
      {/* 1. CUSTOMER IDENTITY & WELCOME HERO                          */}
      {/* ============================================================ */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-r from-orange-500/5 via-muted/40 to-background p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-xl font-black text-white shadow-lg shadow-orange-600/20">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  Hello, {customerName}!
                </h1>
                <Badge variant="secondary" className="gap-1 text-[11px] font-semibold bg-orange-500/10 text-orange-600 border-orange-200">
                  <ShieldCheck className="h-3 w-3" />
                  Verified Buyer
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {customerEmail} • Account active since {user?.createdAt ? formatDate(user.createdAt) : '2024'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="h-10 rounded-full px-5 text-xs font-semibold">
              <Link href="/profile">
                <User className="mr-2 h-3.5 w-3.5" />
                Manage Profile
              </Link>
            </Button>
            <Button asChild size="sm" className="h-10 rounded-full bg-zinc-950 px-5 text-xs font-semibold text-white hover:bg-zinc-800">
              <Link href="/products">
                <Compass className="mr-2 h-3.5 w-3.5 text-orange-400" />
                Browse Deals
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. CUSTOMER METRIC CARDS                                     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Total Orders */}
        <Link href="/orders" className="group">
          <Card className="h-full border-border/70 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-orange-300 group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                All Orders
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black tracking-tight text-foreground tabular-nums">
                {orders.length}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Lifetime purchases</p>
            </CardContent>
          </Card>
        </Link>

        {/* In-Transit Orders */}
        <Link href="/orders" className="group">
          <Card className={cn(
            "h-full border-border/70 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md",
            activeOrders.length > 0 ? "border-amber-300 bg-amber-500/5" : ""
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                In-Transit
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black tracking-tight text-foreground tabular-nums">
                {activeOrders.length}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Active deliveries</p>
            </CardContent>
          </Card>
        </Link>

        {/* Wishlist Items */}
        <Link href="/wishlist" className="group">
          <Card className="h-full border-border/70 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-rose-300 group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Wishlist
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                <Heart className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black tracking-tight text-foreground tabular-nums">
                {wishlistCount}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Saved products</p>
            </CardContent>
          </Card>
        </Link>

        {/* Shopping Cart */}
        <Link href="/cart" className="group">
          <Card className="h-full border-border/70 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-blue-300 group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cart Items
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black tracking-tight text-foreground tabular-nums">
                {cartCount}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Waiting in basket</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ============================================================ */}
      {/* 3. RECENT ORDERS & QUICK SHORTCUTS                           */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders (2 cols) */}
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-bold">Recent Orders</CardTitle>
              <CardDescription className="text-xs">
                Track status and view details of your recent purchases
              </CardDescription>
            </div>
            {orders.length > 0 && (
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs font-semibold">
                <Link href="/orders">
                  View all ({orders.length})
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 w-full bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-2xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 mb-3">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground">You haven&apos;t placed any orders yet</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  Explore thousands of vetted products with direct seller pricing and instant buyer protection.
                </p>
                <Button asChild size="sm" className="mt-4 rounded-full bg-orange-600 px-6 text-white hover:bg-orange-700">
                  <Link href="/products">
                    Start Shopping
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">Order #{order.id}</span>
                        <span className="text-xs text-muted-foreground">• {formatDate(order.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {order.items?.length || 0} items • Total:{' '}
                        <strong className="text-foreground">{formatPrice(order.total)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={order.status as any} size="sm" />
                      <Button asChild variant="outline" size="sm" className="h-8 rounded-full text-xs font-semibold">
                        <Link href={`/orders/${order.id}`}>
                          Track Order
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Account Shortcuts (1 col) */}
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Account Center</CardTitle>
            <CardDescription className="text-xs">Quick shortcuts to your settings &amp; support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link
              href="/orders"
              className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3 transition-colors hover:border-orange-300 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Order History</p>
                  <p className="text-[11px] text-muted-foreground">Receipts and tracking numbers</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/wishlist"
              className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3 transition-colors hover:border-orange-300 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                  <Heart className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">My Wishlist</p>
                  <p className="text-[11px] text-muted-foreground">{wishlistCount} saved products</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/profile"
              className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3 transition-colors hover:border-orange-300 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Account &amp; Security</p>
                  <p className="text-[11px] text-muted-foreground">Password, 2FA, and addresses</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/support"
              className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3 transition-colors hover:border-orange-300 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <LifeBuoy className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Help &amp; FAQs</p>
                  <p className="text-[11px] text-muted-foreground">Customer support &amp; dispute center</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* 4. CURATED DEALS & DISCOVERIES FOR YOU                       */}
      {/* ============================================================ */}
      {recommendedProducts.length > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-orange-600">
                <Sparkles className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Picked For You</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                Recommended Discoveries
              </h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs font-semibold">
              <Link href="/products">
                Explore catalog
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {recommendedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}