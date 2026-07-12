'use client';

import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import type { Order } from '@/types';

const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const { allOrders, ordersLoading, updateOrderStatus } = useAdmin();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // ✅ Defensive normalization: `allOrders` has been observed coming back
  // as a paginated envelope (e.g. `{ data: [...], total, page }`) rather
  // than a bare array, which crashes `.map()` with "allOrders.map is not
  // a function" — `?.` only guards null/undefined, not wrong-type. This
  // accepts either shape so the page never hard-crashes regardless of
  // what the hook currently returns. The real fix belongs in useAdmin.ts
  // (or the service it calls) so this normalization becomes unnecessary.
  const orders = useMemo<Order[]>(() => {
    if (Array.isArray(allOrders)) return allOrders as Order[];
    if (allOrders && Array.isArray((allOrders as { data?: unknown }).data)) {
      return (allOrders as { data: Order[] }).data;
    }
    if (allOrders && Array.isArray((allOrders as { items?: unknown }).items)) {
      return (allOrders as { items: Order[] }).items;
    }
    return [];
  }, [allOrders]);

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      setUpdatingId(orderId);
      await updateOrderStatus({ id: orderId, status });
      toast.success(`Order #${orderId} status updated to ${status}`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  // ✅ Role guard kept after all hooks (same fix applied to the
  // superadmin vendors page) — an early return before hooks have all
  // run breaks React's Rules of Hooks the moment `user` resolves from
  // loading/null to a real role between renders.
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Access denied
      </div>
    );
  }

  if (ordersLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Manage orders</h1>
        <p className="text-muted-foreground">View and update order status across the platform</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Order ID
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Customer
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Items
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Total
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Date
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium tabular-nums">#{order.id}</TableCell>
                  <TableCell>{order.user?.name || 'Unknown'}</TableCell>
                  <TableCell>{order.items?.length || 0} items</TableCell>
                  <TableCell className="tabular-nums">{formatPrice(order.total)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusChange(order.id, value)}
                      disabled={updatingId === order.id}
                    >
                      <SelectTrigger className="h-8 w-35 rounded-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {orderStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}