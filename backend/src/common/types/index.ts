// src/common/types/index.ts
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
  meta?: Record<string, any>;
}

export interface OrderExportData {
  id: number;
  customer: string;
  email: string;
  total: string;
  status: string;
  items: number;
  orderDate: string;
}

export interface VendorStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
}

export interface PerformanceMetrics {
  salesTrend: SalesTrendItem[];
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  growthRate: number;
  topProducts: TopProduct[];
  period: 'day' | 'week' | 'month' | 'year';
  comparison: ComparisonData;
}

export interface SalesTrendItem {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: number;
  title: string;
  sold: number;
  revenue: number;
}

export interface ComparisonData {
  previousRevenue: number;
  revenueChange: number;
  previousOrders: number;
  ordersChange: number;
}

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}