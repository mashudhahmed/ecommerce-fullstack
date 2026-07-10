// src/common/utils/analytics.utils.ts
import { Order } from '../../orders/order.entity';

export interface DailyData {
  date: string;
  revenue: number;
  orders: number;
}

export interface WeeklyData {
  week: string;
  revenue: number;
  orders: number;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  orders: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface StatusRevenueDistribution {
  status: string;
  count: number;
  revenue: number;
}

export class AnalyticsUtils {
  static groupByDay(orders: Order[]): DailyData[] {
    const grouped: Record<string, { revenue: number; orders: number }> = {};

    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { revenue: 0, orders: 0 };
      }
      grouped[date].revenue += Number(order.total);
      grouped[date].orders += 1;
    }

    return Object.entries(grouped).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
    }));
  }

  static groupByWeek(orders: Order[]): WeeklyData[] {
    const grouped: Record<string, { revenue: number; orders: number }> = {};

    for (const order of orders) {
      const date = new Date(order.createdAt);
      const week = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
      if (!grouped[week]) {
        grouped[week] = { revenue: 0, orders: 0 };
      }
      grouped[week].revenue += Number(order.total);
      grouped[week].orders += 1;
    }

    return Object.entries(grouped).map(([week, data]) => ({
      week,
      revenue: data.revenue,
      orders: data.orders,
    }));
  }

  static groupByMonth(orders: Order[]): MonthlyData[] {
    const grouped: Record<string, { revenue: number; orders: number }> = {};

    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      const month = date.substring(0, 7);
      if (!grouped[month]) {
        grouped[month] = { revenue: 0, orders: 0 };
      }
      grouped[month].revenue += Number(order.total);
      grouped[month].orders += 1;
    }

    return Object.entries(grouped).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      orders: data.orders,
    }));
  }

  static getStatusDistribution(orders: Order[]): StatusDistribution[] {
    const distribution: Record<string, number> = {};
    const total = orders.length;

    for (const order of orders) {
      distribution[order.status] = (distribution[order.status] || 0) + 1;
    }

    return Object.entries(distribution).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  static getStatusRevenueDistribution(orders: Order[]): StatusRevenueDistribution[] {
    const distribution: Record<string, { count: number; revenue: number }> = {};

    for (const order of orders) {
      if (!distribution[order.status]) {
        distribution[order.status] = { count: 0, revenue: 0 };
      }
      distribution[order.status].count += 1;
      distribution[order.status].revenue += Number(order.total);
    }

    return Object.entries(distribution).map(([status, data]) => ({
      status,
      count: data.count,
      revenue: data.revenue,
    }));
  }

  static getWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  static calculateAverageProcessingTime(orders: Order[]): number {
    const processedOrders = orders.filter(
      (o) => o.status === 'delivered' || o.status === 'shipped',
    );
    if (processedOrders.length === 0) return 0;

    let totalHours = 0;
    for (const order of processedOrders) {
      const hours = (new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
      totalHours += Math.min(hours, 168);
    }
    return totalHours / processedOrders.length;
  }

  static calculateAverageDeliveryTime(orders: Order[]): number {
    const deliveredOrders = orders.filter((o) => o.status === 'delivered');
    if (deliveredOrders.length === 0) return 0;

    let totalDays = 0;
    for (const order of deliveredOrders) {
      const days = (new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      totalDays += Math.min(days, 30);
    }
    return totalDays / deliveredOrders.length;
  }

  static getPeakHours(orders: Order[]): { hour: number; orders: number }[] {
    const hours: Record<number, number> = {};
    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    }
    return Object.entries(hours)
      .map(([hour, count]) => ({ hour: parseInt(hour, 10), orders: count }))
      .sort((a, b) => b.orders - a.orders);
  }

  static getTopCustomers(orders: Order[], limit: number = 10): any[] {
    const customers: Record<number, { id: number; name: string; email: string; orders: number; totalSpent: number }> = {};

    for (const order of orders) {
      if (!order.user) continue;
      const key = order.user.id;
      if (!customers[key]) {
        customers[key] = {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email,
          orders: 0,
          totalSpent: 0,
        };
      }
      customers[key].orders += 1;
      customers[key].totalSpent += Number(order.total);
    }

    return Object.values(customers)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }
}