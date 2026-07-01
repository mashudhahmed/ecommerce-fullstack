import { apiClient } from '@/lib/api-client';
import { Order, ApiResponse } from '@/types';

export interface CreateOrderData {
  items: {
    productId: number;
    quantity: number;
  }[];
}

export const orderService = {
  async getOrders(): Promise<Order[]> {
    try {
      console.log('📡 Fetching orders...');
      const { data } = await apiClient.get<ApiResponse<Order[]>>('/orders/my');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error);
      return [];
    }
  },

  async getOrder(id: number): Promise<Order> {
    try {
      const { data } = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
      return data.data;
    } catch (error) {
      console.error(`❌ Failed to fetch order ${id}:`, error);
      throw error;
    }
  },

  async getAllOrders(): Promise<Order[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<Order[]>>('/orders');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch all orders:', error);
      return [];
    }
  },

  async createOrder(orderData: CreateOrderData): Promise<Order> {
    try {
      const { data } = await apiClient.post<ApiResponse<Order>>('/orders', orderData);
      return data.data;
    } catch (error) {
      console.error('❌ Failed to create order:', error);
      throw error;
    }
  },

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    try {
      const { data } = await apiClient.patch<ApiResponse<Order>>(
        `/orders/${id}/status`,
        { status }
      );
      return data.data;
    } catch (error) {
      console.error(`❌ Failed to update order ${id}:`, error);
      throw error;
    }
  },

  async cancelOrder(id: number): Promise<Order> {
    try {
      const { data } = await apiClient.patch<ApiResponse<Order>>(`/orders/${id}/cancel`);
      return data.data;
    } catch (error) {
      console.error(`❌ Failed to cancel order ${id}:`, error);
      throw error;
    }
  },

  // ✅ FIXED: Always return an object, never undefined
  async getOrderSummary(): Promise<any> {
    try {
      console.log('📡 Fetching order summary...');
      const { data } = await apiClient.get<ApiResponse<any>>('/orders/my/summary');
      console.log('✅ Order summary fetched:', data.data);
      
      // ✅ Ensure we always return an object with default values
      return {
        totalOrders: data.data?.totalOrders || 0,
        totalSpent: data.data?.totalSpent || 0,
        pendingOrders: data.data?.pendingOrders || 0,
        recentOrders: data.data?.recentOrders || [],
        ...(data.data || {}),
      };
    } catch (error) {
      console.error('❌ Failed to fetch order summary:', error);
      // ✅ Always return a valid object, never undefined
      return {
        totalOrders: 0,
        totalSpent: 0,
        pendingOrders: 0,
        recentOrders: [],
      };
    }
  },
};