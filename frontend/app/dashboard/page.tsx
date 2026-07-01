'use client';

import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderCard } from '@/components/orders/OrderCard';
import { formatPrice } from '@/lib/utils';
import { Package, DollarSign, Clock, ShoppingBag } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { orders, orderSummary, isLoading } = useOrders();

  if (isLoading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  const stats = [
    {
      title: 'Total Orders',
      value: orderSummary?.totalOrders || 0,
      icon: Package,
      color: 'text-blue-500',
    },
    {
      title: 'Total Spent',
      value: formatPrice(orderSummary?.totalSpent || 0),
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      title: 'Pending Orders',
      value: orderSummary?.pendingOrders || 0,
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      title: 'Active Orders',
      value: orders?.filter((o) => o.status !== 'cancelled' && o.status !== 'delivered').length || 0,
      icon: ShoppingBag,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground">Here's a summary of your orders</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Recent Orders</h2>
        {orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No orders yet.</p>
        )}
      </div>
    </div>
  );
}