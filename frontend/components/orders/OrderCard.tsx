// components/orders/OrderCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Order } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { useOrders } from '@/hooks/useOrders';
import { toast } from 'sonner';
import { Eye, Package, Clock, Truck, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';

interface OrderCardProps {
  order: Order;
  viewMode?: 'grid' | 'list';
  onViewDetails?: () => void;
}

const STATUS_ICONS = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export function OrderCard({ order, viewMode = 'list', onViewDetails }: OrderCardProps) {
  const { cancelOrder, isCancellingOrder } = useOrders();
  const StatusIcon = STATUS_ICONS[order.status] || Package;

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

  // Get first product image for display
  const firstItem = order.items?.[0];
  const imageSrc = useMemo(() => {
    if (!firstItem?.product?.imageUrl) {
      return '/placeholder-image.png';
    }
    return firstItem.product.imageUrl;
  }, [firstItem]);

  if (viewMode === 'grid') {
    return (
      <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group h-full flex flex-col" onClick={onViewDetails}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <p className="font-semibold text-sm">Order #{order.id}</p>
            <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
          </div>
          <Badge className={cn("border", STATUS_COLORS[order.status])}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {order.items.length} item{order.items.length > 1 ? 's' : ''}
            </p>
            <p className="text-xl font-bold">{formatPrice(order.total)}</p>
          </div>
        </CardContent>
        <CardFooter className="pt-0 flex justify-between">
          <Button variant="ghost" size="sm" className="gap-1 group-hover:gap-2 transition-all">
            View Details
            <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isCancellingOrder}
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
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={onViewDetails}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted">
            <Image
              src={imageSrc}
              alt={firstItem?.product?.title || 'Product'}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">Order #{order.id}</p>
              <Badge className={cn("border text-xs", STATUS_COLORS[order.status])}>
                <StatusIcon className="h-2.5 w-2.5 mr-1" />
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(order.createdAt)}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {order.items.length} item{order.items.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto sm:ml-0">
          <div className="text-right">
            <p className="text-lg font-bold">{formatPrice(order.total)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:bg-primary/10 transition-colors">
              <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Button>
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={isCancellingOrder}
                className="h-8"
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