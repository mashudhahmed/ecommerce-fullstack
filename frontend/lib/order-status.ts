// lib/order-status.ts
import { Clock, Package, Truck, CheckCircle, XCircle, type LucideIcon } from 'lucide-react';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderStatusMeta {
  label: string;
  icon: LucideIcon;
  dot: string;
  text: string;
  bg: string;
  border: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusMeta> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  processing: {
    label: 'Processing',
    icon: Package,
    dot: 'bg-sky-500',
    text: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    dot: 'bg-violet-500',
    text: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    dot: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
};

export const ORDER_STATUS_LIST: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];