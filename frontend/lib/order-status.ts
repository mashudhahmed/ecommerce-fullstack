// lib/order-status.ts
import { Clock, Package, Truck, CheckCircle, XCircle, Check, HelpCircle, type LucideIcon } from 'lucide-react';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'partially_shipped'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

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
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800/40',
  },
  confirmed: {
    label: 'Confirmed',
    icon: Check,
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800/40',
  },
  processing: {
    label: 'Processing',
    icon: Package,
    dot: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    border: 'border-sky-200 dark:border-sky-800/40',
  },
  partially_shipped: {
    label: 'Partially Shipped',
    icon: Truck,
    dot: 'bg-indigo-500',
    text: 'text-indigo-700 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
    border: 'border-indigo-200 dark:border-indigo-800/40',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    dot: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/20',
    border: 'border-violet-200 dark:border-violet-800/40',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800/40',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800/40',
  },
};

export const ORDER_STATUS_LIST: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'partially_shipped',
  'shipped',
  'delivered',
  'cancelled',
];