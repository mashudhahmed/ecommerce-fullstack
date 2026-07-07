// src/vendor/interfaces/vendor-analytics.interface.ts

export interface PerformanceMetrics {
  salesTrend: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  growthRate: number;
  topProducts: {
    id: number;
    title: string;
    sold: number;
    revenue: number;
  }[];
  period: 'day' | 'week' | 'month' | 'year';
  comparison: {
    previousRevenue: number;
    revenueChange: number;
    previousOrders: number;
    ordersChange: number;
  };
}

export interface RevenueAnalytics {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    period: {
      start: Date;
      end: Date;
    };
  };
  dailyData: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  weeklyData: {
    week: string;
    revenue: number;
    orders: number;
  }[];
  monthlyData: {
    month: string;
    revenue: number;
    orders: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
    revenue: number;
  }[];
}

export interface OrderAnalytics {
  orderTrends: {
    date: string;
    orders: number;
    revenue: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
    percentage: number;
  }[];
  peakHours: {
    hour: number;
    orders: number;
  }[];
  averageProcessingTime: number;
  averageDeliveryTime: number;
  topCustomers: {
    id: number;
    name: string;
    email: string;
    orders: number;
    totalSpent: number;
  }[];
}

export interface BulkUploadResult {
  success: number;
  failed: number;
  errors: {
    row: number;
    error: string;
  }[];
  created: {
    id: number;
    title: string;
  }[];
  skipped: {
    row: number;
    reason: string;
  }[];
}