// services/vendor.service.ts
import { apiClient } from '@/lib/api-client';
import { Product, Order, ApiResponse, PaginatedResponse } from '@/types';

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
  recentOrders: Order[];
}

export interface PerformanceMetrics {
  salesTrend: { date: string; revenue: number; orders: number }[];
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  growthRate: number;
  topProducts: { id: number; title: string; sold: number; revenue: number }[];
}

export const vendorService = {
  // Dashboard
  async getDashboard(): Promise<VendorStats> {
    const { data } = await apiClient.get<ApiResponse<VendorStats>>('/vendors/dashboard');
    return data.data;
  },

  async getPerformance(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<PerformanceMetrics> {
    const { data } = await apiClient.get<ApiResponse<PerformanceMetrics>>(`/vendors/performance?period=${period}`);
    return data.data;
  },

  // Products
  async getProducts(page: number = 1, limit: number = 20, inStock?: boolean): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (inStock !== undefined) params.append('inStock', String(inStock));
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>(`/vendors/products?${params.toString()}`);
    return data.data;
  },

  async bulkUploadProducts(products: any[]): Promise<any> {
    const { data } = await apiClient.post<ApiResponse<any>>('/vendors/products/bulk-upload', { products });
    return data.data;
  },

  async bulkDeleteProducts(productIds: number[]): Promise<any> {
    const { data } = await apiClient.delete<ApiResponse<any>>('/vendors/products/bulk-delete', { data: { productIds } });
    return data.data;
  },

  // Orders
  async getOrders(status?: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', String(page));
    params.append('limit', String(limit));
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Order>>>(`/vendors/orders?${params.toString()}`);
    return data.data;
  },

  async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    const { data } = await apiClient.patch<ApiResponse<Order>>(`/orders/${orderId}/vendor-status`, { status });
    return data.data;
  },

  // Profile
  async getProfile(): Promise<any> {
    const { data } = await apiClient.get<ApiResponse<any>>('/vendors/profile');
    return data.data;
  },

  async updateProfile(profileData: any): Promise<any> {
    const { data } = await apiClient.put<ApiResponse<any>>('/vendors/profile', profileData);
    return data.data;
  },
};