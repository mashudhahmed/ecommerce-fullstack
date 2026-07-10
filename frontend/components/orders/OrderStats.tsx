// components/orders/OrderStats.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Package, Clock, Truck, CheckCircle, XCircle, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const statItems = [
  { key: 'total', label: 'Total', icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50' },
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { key: 'processing', label: 'Processing', icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
  { key: 'shipped', label: 'Shipped', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
];

export function OrderStats({ stats }: OrderStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
      {statItems.map(({ key, label, icon: Icon, color, bg }) => {
        const value = stats[key as keyof typeof stats] || 0;
        return (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}