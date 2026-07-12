// app/vendor/orders/page.tsx
'use client';

import { useState } from 'react';
import { useVendor } from '@/hooks/useVendor';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { formatPrice, formatDate } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function VendorOrdersPage() {
  const { ordersData, ordersLoading, updateOrderStatus, updateOrderStatusLoading } = useVendor();
  const [statusFilter, setStatusFilter] = useState<string>('');

  // ✅ Fix: Properly handle the data structure
  const orders = (ordersData as any)?.data || (Array.isArray(ordersData) ? ordersData : []);

  const filteredOrders = statusFilter
    ? orders.filter((o: any) => o.status === statusFilter)
    : orders;

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await updateOrderStatus({ orderId, status });
    } catch (error: any) {
      // Toast handled in hook
    }
  };

  if (ordersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {orderStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order: any) => (
            <Card key={order.id}>
              <CardContent className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                <div>
                  <p className="font-semibold">Order #{order.id}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                  <p className="text-sm">
                    {order.items.length} item{order.items.length > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <p className="font-bold">{formatPrice(order.total)}</p>
                  <OrderStatusBadge status={order.status} />
                </div>

                <Select
                  value={order.status}
                  onValueChange={(value) => handleStatusChange(order.id, value)}
                  disabled={updateOrderStatusLoading}
                >
                  <SelectTrigger className="w-35">
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
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No orders found</p>
      )}
    </div>
  );
}