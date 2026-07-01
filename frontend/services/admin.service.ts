import { apiClient } from '@/lib/api-client';
import { User, Order, Product, ApiResponse } from '@/types';

export interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  revenue: number;
  pendingOrders: number;
}

// ✅ Set to true to use real API
const USE_API = true;

export const adminService = {
  async getStats(): Promise<DashboardStats> {
    try {
      const { data } = await apiClient.get<ApiResponse<DashboardStats>>('/admin/stats');
      return data.data;
    } catch (error) {
      console.error('❌ Failed to fetch stats:', error);
      throw error;
    }
  },

  async getAllUsers(): Promise<User[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<User[]>>('/auth/users');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      throw error;
    }
  },

  async deleteUser(id: number): Promise<void> {
    try {
      await apiClient.delete(`/auth/users/${id}`);
    } catch (error) {
      console.error(`❌ Failed to delete user ${id}:`, error);
      throw error;
    }
  },

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    try {
      const { data } = await apiClient.patch<ApiResponse<Order>>(
        `/admin/order/${id}/status`,
        { status }
      );
      return data.data;
    } catch (error) {
      console.error(`❌ Failed to update order ${id}:`, error);
      throw error;
    }
  },

  async getAllOrders(): Promise<Order[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<Order[]>>('/admin/orders');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error);
      throw error;
    }
  },

  async getAllProducts(): Promise<Product[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<Product[]>>('/admin/products');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch products:', error);
      throw error;
    }
  },

  async createAdmin(userData: { name: string; email: string; password: string }): Promise<User> {
    try {
      const { data } = await apiClient.post<ApiResponse<User>>('/superadmin/create-admin', userData);
      return data.data;
    } catch (error) {
      console.error('❌ Failed to create admin:', error);
      throw error;
    }
  },
};