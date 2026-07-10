import { apiClient } from '@/lib/api-client';
import { User, Order, Product, ApiResponse } from '@/types';

export interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  revenue: number;
  pendingOrders: number;
  totalVendors: number;
  pendingVendors: number;
  userStats: {
    totalUsers: number;
    totalVendors: number;
    totalAdmins: number;
    totalSuperAdmins: number;
    verifiedUsers: number;
    pendingVendors: number;
    approvedVendors: number;
  };
}

export const adminService = {
  // ✅ Get dashboard stats
  async getStats(): Promise<DashboardStats> {
    try {
      const { data } = await apiClient.get<ApiResponse<DashboardStats>>('/admin/stats');
      return data.data;
    } catch (error) {
      console.error('❌ Failed to fetch stats:', error);
      throw error;
    }
  },

  // ✅ Get all users
  async getAllUsers(): Promise<User[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<User[]>>('/admin/users');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      throw error;
    }
  },

  // ✅ Get user by ID
  async getUser(id: number): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<User>>(`/admin/users/${id}`);
    return data.data;
  },

  // ✅ Delete user
  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  },

  // ✅ Get all products (admin)
  async getAllProducts(): Promise<Product[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<Product[]>>('/admin/products');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch products:', error);
      throw error;
    }
  },

  // ✅ Get all orders (admin)
  async getAllOrders(): Promise<Order[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<Order[]>>('/admin/orders');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error);
      throw error;
    }
  },

  // ✅ Update order status (admin)
  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const { data } = await apiClient.patch<ApiResponse<Order>>(
      `/admin/order/${id}/status`,
      { status }
    );
    return data.data;
  },

  // ✅ Get all vendors
  async getAllVendors(): Promise<User[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<User[]>>('/admin/vendors');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch vendors:', error);
      throw error;
    }
  },

  // ✅ Get pending vendors
  async getPendingVendors(): Promise<User[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<User[]>>('/admin/vendors/pending');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch pending vendors:', error);
      throw error;
    }
  },

  // ✅ Create admin (superadmin only)
  async createAdmin(userData: { name: string; email: string; password: string }): Promise<User> {
    const { data } = await apiClient.post<ApiResponse<User>>('/superadmin/admins', userData);
    return data.data;
  },

  // ✅ Delete admin (superadmin only)
  async deleteAdmin(id: number): Promise<void> {
    await apiClient.delete(`/superadmin/admins/${id}`);
  },

  // ✅ Get all admins (superadmin only)
  async getAdmins(): Promise<User[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<User[]>>('/superadmin/admins');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch admins:', error);
      return [];
    }
  },
};