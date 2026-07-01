'use client';

import Link from 'next/link';
import { Order } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { OrderStatusBadge } from './OrderStatusBadge';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/hooks/useOrders';
import { toast } from 'sonner';

interface OrderCardProps {
  order: Order;
  showActions?: boolean;
}

export function OrderCard({ order, showActions = true }: OrderCardProps) {
  const { cancelOrder, isCancellingOrder } = useOrders();

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder(order.id);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to cancel order');
    }
  };

  const canCancel = order.status === 'pending' || order.status === 'processing';

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <p className="font-semibold">Order #{order.id}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(order.createdAt)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-sm">
              {order.items.length} item{order.items.length > 1 ? 's' : ''}
            </p>
            <p className="text-lg font-bold">{formatPrice(order.total)}</p>
          </div>
        </CardContent>
        {showActions && canCancel && (
          <CardFooter className="pt-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCancel();
              }}
              disabled={isCancellingOrder}
            >
              Cancel Order
            </Button>
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}