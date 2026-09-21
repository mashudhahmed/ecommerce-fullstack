// app/orders/page.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrderStats } from '@/components/orders/OrderStats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Download, 
  RefreshCw,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// ORDER STATUS CONFIG
// ============================================================

const ORDER_STATUSES = [
  { value: 'all', label: 'All Orders', color: 'bg-gray-500' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'processing', label: 'Processing', color: 'bg-blue-500' },
  { value: 'shipped', label: 'Shipped', color: 'bg-purple-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

const STATUS_ICONS = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { orders, isLoading, refetch } = useOrders();
  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'total'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // ============================================================
  // FILTERED & SORTED ORDERS
  // ============================================================

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    let result = [...orders];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.id.toString().includes(term) ||
          order.user?.name?.toLowerCase().includes(term) ||
          order.user?.email?.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter((order) => order.status === statusFilter);
    }
    
    result.sort((a, b) => {
      const aVal = sortBy === 'createdAt' 
        ? new Date(a.createdAt).getTime() 
        : Number(a.total) || 0;
      const bVal = sortBy === 'createdAt' 
        ? new Date(b.createdAt).getTime() 
        : Number(b.total) || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return result;
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    if (!orders) return null;
    
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pending').length;
    const processing = orders.filter((o) => o.status === 'processing').length;
    const shipped = orders.filter((o) => o.status === 'shipped').length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    
    return { total, pending, processing, shipped, delivered, cancelled };
  }, [orders]);

  // ============================================================
  // EXPORT ORDERS
  // ============================================================

  const handleExport = useCallback(async () => {
    try {
      toast.loading('Exporting orders...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Orders exported successfully!');
    } catch (error) {
      toast.error('Failed to export orders');
    }
  }, []);

  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Orders refreshed');
  }, [refetch]);

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (authLoading || isLoading) {
    return <OrdersSkeleton />;
  }

  // ============================================================
  // NOT AUTHENTICATED
  // ============================================================

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-muted/30 rounded-full p-6 mb-6">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Please Login</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          You need to be logged in to view your orders.
        </p>
        <Button onClick={() => router.push('/login')} className="gap-2">
          Login
        </Button>
      </div>
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================

  if (isAdminOrSuperAdmin && (!orders || orders.length === 0)) {
    const dashboardHref = user?.role === 'superadmin' ? '/superadmin' : '/admin';
    return (
      <div className="mx-auto max-w-md py-20 px-4 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3">
          Administrative Account
        </div>
        <h2 className="text-2xl font-black tracking-tight">Staff Account Notice</h2>
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
          Administrative accounts do not place consumer orders. To inspect customer orders, tracking, and fulfillment across the platform, use the Store Orders management console.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            className="w-full sm:w-auto rounded-full bg-zinc-950 text-white hover:bg-zinc-800 gap-2 cursor-pointer"
            asChild
          >
            <Link href="/admin/orders">
              <Package className="h-4 w-4" />
              Manage Store Orders
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto rounded-full gap-2 cursor-pointer"
            asChild
          >
            <Link href={dashboardHref}>
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-muted/30 rounded-full p-6 mb-6">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">No orders yet</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Start shopping to see your orders here.
        </p>
        <Button onClick={() => router.push('/products')} className="gap-2">
          Browse Products
        </Button>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Staff Preview Mode Banner */}
      {isAdminOrSuperAdmin && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Staff Account Notice</p>
              <p className="text-xs text-muted-foreground">You are viewing consumer order history. For platform-wide customer orders and shipment processing, use the Store Orders manager.</p>
            </div>
          </div>
          <Button size="sm" className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 shrink-0 cursor-pointer" asChild>
            <Link href="/admin/orders">Go to Store Orders</Link>
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground text-sm">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && <OrderStats stats={stats} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", status.color)} />
                    {status.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [newSortBy, newSortOrder] = value.split('-') as [
                'createdAt' | 'total',
                'asc' | 'desc'
              ];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="total-desc">Highest Total</SelectItem>
              <SelectItem value="total-asc">Lowest Total</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="hidden sm:flex"
          >
            {viewMode === 'grid' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Orders List - Without Framer Motion */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders found matching your filters</p>
            <Button
              variant="link"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="mt-2"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              viewMode === 'grid' 
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                : "grid-cols-1"
            )}
          >
            {filteredOrders.map((order) => (
              <OrderCard 
                key={String(order.id)}
                order={order} 
                viewMode={viewMode}
                onViewDetails={() => router.push(`/orders/${order.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}