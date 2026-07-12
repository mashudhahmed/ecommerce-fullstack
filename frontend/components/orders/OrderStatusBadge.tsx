// components/orders/OrderStatusBadge.tsx
'use client';

import { cn } from '@/lib/utils';
import { ORDER_STATUS_CONFIG, type OrderStatus } from '@/lib/order-status';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const sizeClasses = {
  sm: 'text-[11px] px-2 py-1 gap-1',
  default: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-1.5',
};

const iconSize = {
  sm: 'h-3 w-3',
  default: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function OrderStatusBadge({ status, showIcon = true, size = 'default' }: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold',
        config.bg,
        config.text,
        config.border,
        sizeClasses[size]
      )}
    >
      {showIcon ? (
        <Icon className={iconSize[size]} />
      ) : (
        <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      )}
      {config.label}
    </span>
  );
}