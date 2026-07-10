// services/order.service.ts
import { apiClient, unwrapData } from '@/lib/api-client';
import { Order } from '@/types';

export interface CreateOrderData {
  items: {
    productId: number;
    quantity: number;
  }[];
  shippingAddress?: string;
  idempotencyKey?: string;
}

export interface OrderSummary {
  totalOrders: number;
  totalSpent: number;
  pendingOrders: number;
  recentOrders: Order[];
}

export interface AdminOrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

export const orderService = {
  // ============================================================
  // GET USER ORDERS - Returns empty array for unauthenticated
  // ============================================================
  async getOrders(): Promise<Order[]> {
    try {
      const response = await apiClient.get('/orders/my');
      const data = unwrapData<Order[]>(response.data);
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      
      // Return empty array for auth errors
      if (status === 401 || status === 403) {
        console.log('User not authenticated, returning empty orders');
        return [];
      }
      
      console.error('Failed to fetch orders:', error?.message || 'Unknown error');
      return [];
    }
  },

  // ============================================================
  // GET SINGLE ORDER
  // ============================================================
  async getOrder(id: number): Promise<Order> {
    const response = await apiClient.get(`/orders/${id}`);
    return unwrapData<Order>(response.data);
  },

  // ============================================================
  // CREATE ORDER
  // ============================================================
  async createOrder(data: CreateOrderData): Promise<Order> {
    const { idempotencyKey, ...orderData } = data;
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }
    const response = await apiClient.post('/orders', orderData, { headers });
    return unwrapData<Order>(response.data);
  },

  // ============================================================
  // CANCEL ORDER
  // ============================================================
  async cancelOrder(id: number): Promise<Order> {
    const response = await apiClient.patch(`/orders/${id}/cancel`);
    return unwrapData<Order>(response.data);
  },

  // ============================================================
  // GET ORDER SUMMARY - Returns empty for unauthenticated
  // ============================================================
  async getOrderSummary(): Promise<OrderSummary> {
    try {
      const response = await apiClient.get('/orders/my/summary');
      const data = unwrapData<OrderSummary>(response.data);
      return {
        totalOrders: data?.totalOrders || 0,
        totalSpent: data?.totalSpent || 0,
        pendingOrders: data?.pendingOrders || 0,
        recentOrders: data?.recentOrders || [],
      };
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      
      if (status === 401 || status === 403) {
        console.log('User not authenticated, returning empty summary');
        return {
          totalOrders: 0,
          totalSpent: 0,
          pendingOrders: 0,
          recentOrders: [],
        };
      }
      
      console.error('Failed to fetch order summary:', error?.message || 'Unknown error');
      return {
        totalOrders: 0,
        totalSpent: 0,
        pendingOrders: 0,
        recentOrders: [],
      };
    }
  },

  // ============================================================
  // GET VENDOR ORDERS
  // ============================================================
  async getVendorOrders(): Promise<Order[]> {
    try {
      const response = await apiClient.get('/orders/vendor');
      const data = unwrapData<Order[]>(response.data);
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      if (status === 401 || status === 403) return [];
      console.error('Failed to fetch vendor orders:', error?.message || 'Unknown error');
      return [];
    }
  },

  // ============================================================
  // GET VENDOR ORDER SUMMARY
  // ============================================================
  async getVendorOrderSummary(): Promise<any> {
    try {
      const response = await apiClient.get('/orders/vendor/summary');
      return unwrapData(response.data) || {};
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      if (status === 401 || status === 403) return {};
      console.error('Failed to fetch vendor order summary:', error?.message || 'Unknown error');
      return {};
    }
  },

  // ============================================================
  // UPDATE VENDOR ORDER STATUS
  // ============================================================
  async updateVendorOrderStatus(id: number, status: string): Promise<Order> {
    const response = await apiClient.patch(`/orders/${id}/vendor-status`, { status });
    return unwrapData<Order>(response.data);
  },

  // ============================================================
  // ADMIN: GET ALL ORDERS
  // ============================================================
  async getAllOrders(): Promise<Order[]> {
    try {
      const response = await apiClient.get('/orders');
      const data = unwrapData<Order[]>(response.data);
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      console.error('Failed to fetch all orders:', error?.message || 'Unknown error');
      return [];
    }
  },

  // ============================================================
  // ADMIN: GET ORDER STATS
  // ============================================================
  async getAdminOrderStats(): Promise<AdminOrderStats> {
    try {
      const response = await apiClient.get('/orders/admin/stats');
      const data = unwrapData<AdminOrderStats>(response.data);
      return {
        totalOrders: data?.totalOrders || 0,
        totalRevenue: data?.totalRevenue || 0,
        pendingOrders: data?.pendingOrders || 0,
        processingOrders: data?.processingOrders || 0,
        shippedOrders: data?.shippedOrders || 0,
        deliveredOrders: data?.deliveredOrders || 0,
        cancelledOrders: data?.cancelledOrders || 0,
      };
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      console.error('Failed to fetch admin order stats:', error?.message || 'Unknown error');
      return {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
      };
    }
  },

  // ============================================================
  // ADMIN: UPDATE ORDER STATUS
  // ============================================================
  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const response = await apiClient.patch(`/orders/${id}/status`, { status });
    return unwrapData<Order>(response.data);
  },
};