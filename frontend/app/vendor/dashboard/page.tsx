// app/vendor/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';  // ✅ Added useEffect
import { useRouter } from 'next/navigation';
import { useVendor } from '@/hooks/useVendor';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  ShoppingBag, 
  DollarSign, 
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

// ============================================================
// TYPES
// ============================================================

interface Order {
  id: number;
  total: number;
  status: string;
  items: any[];
  createdAt: string;
  user?: { name: string; email: string };
}

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  recentOrders: Order[];
}

interface PerformanceData {
  salesTrend: { date: string; revenue: number; orders: number }[];
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  growthRate: number;
  topProducts: { id: number; title: string; sold: number; revenue: number }[];
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function VendorDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    dashboard, 
    dashboardLoading, 
    performance, 
    performanceLoading,
    refetchDashboard 
  } = useVendor();

  // ✅ Redirect if not authenticated or not vendor
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'vendor' && user?.role !== 'admin' && user?.role !== 'superadmin') {
        router.push('/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // ✅ Refresh dashboard every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchDashboard();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchDashboard]);

  // ✅ Loading state
  if (authLoading || dashboardLoading || performanceLoading) {
    return <DashboardSkeleton />;
  }

  // ✅ Type-safe access with fallback values
  const stats = [
    {
      title: 'Total Revenue',
      value: formatPrice(dashboard?.totalRevenue ?? 0),
      icon: DollarSign,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      title: 'Total Orders',
      value: dashboard?.totalOrders ?? 0,
      icon: ShoppingBag,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      title: 'Total Products',
      value: dashboard?.totalProducts ?? 0,
      icon: Package,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-950/20',
    },
    {
      title: 'Pending Orders',
      value: dashboard?.pendingOrders ?? 0,
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
  ];

  // ✅ Safely access dashboard properties
  const totalOrders = dashboard?.totalOrders ?? 0;
  const pendingOrders = dashboard?.pendingOrders ?? 0;
  const processingOrders = dashboard?.processingOrders ?? 0;
  const shippedOrders = dashboard?.shippedOrders ?? 0;
  const deliveredOrders = dashboard?.deliveredOrders ?? 0;
  const cancelledOrders = dashboard?.cancelledOrders ?? 0;

  const orderStatuses = [
    { status: 'Pending', count: pendingOrders, color: 'bg-yellow-500' },
    { status: 'Processing', count: processingOrders, color: 'bg-blue-500' },
    { status: 'Shipped', count: shippedOrders, color: 'bg-purple-500' },
    { status: 'Delivered', count: deliveredOrders, color: 'bg-green-500' },
    { status: 'Cancelled', count: cancelledOrders, color: 'bg-red-500' },
  ];

  const salesData = performance?.salesTrend ?? [];
  const growthRate = performance?.growthRate ?? 0;

  // ✅ Get recent orders safely
  const recentOrders = dashboard?.recentOrders ?? [];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name ?? 'Vendor'}!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your store today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchDashboard()}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.title === 'Total Revenue' && (
                <div className="flex items-center gap-1 mt-1">
                  {growthRate >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    growthRate >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {Math.abs(growthRate).toFixed(1)}% from last month
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Chart */}
      {salesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value: any) =>
                      typeof value === 'number' ? formatPrice(value) : value
                    }
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orderStatuses.map((status) => (
                <div key={status.status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{status.status}</span>
                    <span className="font-medium">{status.count}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", status.color)}
                      style={{
                        width: `${totalOrders > 0 
                          ? (status.count / totalOrders) * 100 
                          : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/vendor/products">
              <Button className="w-full justify-start gap-3">
                <Package className="h-4 w-4" />
                Manage Products
              </Button>
            </Link>
            <Link href="/vendor/orders">
              <Button variant="outline" className="w-full justify-start gap-3">
                <ShoppingBag className="h-4 w-4" />
                View All Orders
              </Button>
            </Link>
            <Link href="/vendor/analytics">
              <Button variant="outline" className="w-full justify-start gap-3">
                <TrendingUp className="h-4 w-4" />
                View Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/vendor/orders">
              <Button variant="ghost" size="sm" className="gap-2">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {recentOrders.slice(0, 5).map((order: Order) => (
                <div key={order.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.items?.length ?? 0} items • {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{formatPrice(order.total)}</span>
                    <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                      {order.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <Link href={`/orders/${order.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}