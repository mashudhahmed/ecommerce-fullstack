// components/orders/OrderStats.tsx
'use client';

import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_CONFIG, ORDER_STATUS_LIST } from '@/lib/order-status';

interface OrderStatsProps {
  stats: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
}

export function OrderStats({ stats }: OrderStatsProps) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-2xl border border-border sm:grid-cols-3 md:grid-cols-6 md:divide-y-0">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50">
          <ShoppingBag className="h-4 w-4 text-orange-600" />
        </div>
        <div>
          <p className="text-xl font-black leading-none tabular-nums">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      {ORDER_STATUS_LIST.map((status) => {
        const config = ORDER_STATUS_CONFIG[status];
        const Icon = config.icon;
        const value = stats[status] || 0;

        return (
          <div key={status} className="flex items-center gap-3 p-4">
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', config.bg)}>
              <Icon className={cn('h-4 w-4', config.text)} />
            </div>
            <div>
              <p className="text-xl font-black leading-none tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{config.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}