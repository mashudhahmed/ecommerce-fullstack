// components/orders/OrderCard.tsx
'use client';

import Image from 'next/image';
import { Order } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { formatPrice, formatDate } from '@/lib/utils';
import { useOrders } from '@/hooks/useOrders';
import { toast } from 'sonner';
import { Eye, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

interface OrderCardProps {
  order: Order;
  viewMode?: 'grid' | 'list';
  onViewDetails?: () => void;
}

export function OrderCard({ order, viewMode = 'list', onViewDetails }: OrderCardProps) {
  const { cancelOrder, isCancellingOrder } = useOrders();

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder(order.id);
      toast.success('Order cancelled successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to cancel order');
    }
  };

  const canCancel = ['pending', 'processing'].includes(order.status);

  const firstItem = order.items?.[0];
  const imageSrc = useMemo(() => {
    if (!firstItem?.product?.imageUrl) {
      return '/placeholder-image.png';
    }
    return firstItem.product.imageUrl;
  }, [firstItem]);

  if (viewMode === 'grid') {
    return (
      <Card
        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-950/5"
        onClick={onViewDetails}
      >
        <div className="relative aspect-[2.4/1] w-full overflow-hidden bg-muted/20">
          <Image
            src={imageSrc}
            alt={firstItem?.product?.title || 'Product'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          {order.items.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-zinc-950/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              +{order.items.length - 1} more
            </span>
          )}
        </div>

        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-4">
          <div>
            <p className="text-sm font-semibold">Order #{order.id}</p>
            <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
          </div>
          <OrderStatusBadge status={order.status} size="sm" />
        </CardHeader>

        <CardContent className="flex-1 pt-0">
          <p className="text-sm text-muted-foreground">
            {order.items.length} item{order.items.length > 1 ? 's' : ''}
          </p>
          <p className="mt-1 text-xl font-black tabular-nums">{formatPrice(order.total)}</p>
        </CardContent>

        <CardFooter className="flex justify-between pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 rounded-full text-muted-foreground transition-all group-hover:gap-1.5 group-hover:text-foreground"
          >
            View details
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCancellingOrder}
              className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Cancel
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  // List view
  return (
    <Card
      className="group cursor-pointer rounded-2xl border border-border/60 transition-all duration-300 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-950/5"
      onClick={onViewDetails}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted/20">
            <Image
              src={imageSrc}
              alt={firstItem?.product?.title || 'Product'}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">Order #{order.id}</p>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
            <p className="truncate text-sm text-muted-foreground">
              {order.items.length} item{order.items.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4 sm:ml-0">
          <p className="text-lg font-black tabular-nums">{formatPrice(order.total)}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full transition-colors group-hover:bg-orange-50"
            >
              <Eye className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-orange-600" />
            </Button>
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isCancellingOrder}
                className="h-9 rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}