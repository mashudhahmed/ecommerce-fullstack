// lib/fallback-orders.ts
import { Order } from '@/types';

export const fallbackOrders: Order[] = [
  {
    id: 1,
    user: {
      id: 1,
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'user',
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    items: [],
    total: 99.99,
    status: 'delivered',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    user: {
      id: 1,
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'user',
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    items: [],
    total: 49.99,
    status: 'processing',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];