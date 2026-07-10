// components/orders/OrderStatusBadge.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, Package, Truck, CheckCircle, XCircle } from 'lucide-react';

interface OrderStatusBadgeProps {
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const statusConfig: Record<
  OrderStatusBadgeProps['status'],
  { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary'; icon: any; color: string }
> = {
  pending: { 
    label: 'Pending', 
    variant: 'secondary', 
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  processing: { 
    label: 'Processing', 
    variant: 'default', 
    icon: Package,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  shipped: { 
    label: 'Shipped', 
    variant: 'default', 
    icon: Truck,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  delivered: { 
    label: 'Delivered', 
    variant: 'default', 
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  cancelled: { 
    label: 'Cancelled', 
    variant: 'destructive', 
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
};

export function OrderStatusBadge({ status, showIcon = true, size = 'default' }: OrderStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge 
      variant={config.variant}
      className={`${sizeClasses[size]} ${config.color} border`}
    >
      {showIcon && <Icon className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-1.5`} />}
      {config.label}
    </Badge>
  );
}