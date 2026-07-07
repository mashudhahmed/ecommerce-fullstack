// src/analytics/dashboard-stats.dto.ts
export class DashboardStats {
  // Sales metrics
  totalRevenue!: number;
  totalOrders!: number;
  averageOrderValue!: number;
  conversionRate!: number;

  // Customer metrics
  totalCustomers!: number;
  newCustomers!: number;
  returningCustomers!: number;

  // Product metrics
  totalProducts!: number;
  outOfStock!: number;
  lowStock!: number;

  // Trends
  revenueTrend!: { date: string; value: number }[];
  orderTrend!: { date: string; value: number }[];
  customerTrend!: { date: string; value: number }[];

  // Top performers
  topProducts!: { id: number; title: string; revenue: number; orders: number }[];
  topCategories!: { id: number; name: string; revenue: number; orders: number }[];
}