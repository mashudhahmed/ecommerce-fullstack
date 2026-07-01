import { apiClient } from '@/lib/api-client';
import { CartItem, ApiResponse } from '@/types';

interface CartTotal {
  total: number;
  itemCount: number;
  items: any[];
}

export const cartService = {
  async getCart(): Promise<CartItem[]> {
    try {
      console.log('📡 Fetching cart...');
      const { data } = await apiClient.get<ApiResponse<CartItem[]>>('/cart');
      console.log('✅ Cart fetched:', data.data);
      return data.data || [];
    } catch (error: any) {
      // ✅ Handle 401/403 gracefully - user not authenticated
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        console.log('ℹ️ User not authenticated, returning empty cart');
        return [];
      }
      console.error('❌ Failed to fetch cart:', error);
      return []; // Return empty array instead of throwing
    }
  },

  async getCartSummary(): Promise<{
    items: CartItem[];
    total: number;
    itemCount: number;
  }> {
    try {
      const { data } = await apiClient.get<ApiResponse<any>>('/cart/summary');
      return data.data;
    } catch (error: any) {
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        console.log('ℹ️ User not authenticated, returning empty cart summary');
        return { items: [], total: 0, itemCount: 0 };
      }
      console.error('❌ Failed to fetch cart summary:', error);
      return { items: [], total: 0, itemCount: 0 };
    }
  },

  async getCartTotal(): Promise<CartTotal> {
    try {
      const { data } = await apiClient.get<ApiResponse<CartTotal>>('/cart/total');
      return data.data;
    } catch (error: any) {
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        return { total: 0, itemCount: 0, items: [] };
      }
      console.error('❌ Failed to fetch cart total:', error);
      return { total: 0, itemCount: 0, items: [] };
    }
  },

  async getCartItemCount(): Promise<{ count: number }> {
    try {
      const { data } = await apiClient.get<ApiResponse<{ count: number }>>('/cart/count');
      return data.data;
    } catch (error: any) {
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        return { count: 0 };
      }
      console.error('❌ Failed to fetch cart count:', error);
      return { count: 0 };
    }
  },

  async addToCart(productId: number, quantity: number): Promise<CartItem> {
    try {
      const { data } = await apiClient.post<ApiResponse<CartItem>>('/cart', {
        productId,
        quantity,
      });
      return data.data;
    } catch (error: any) {
      console.error('❌ Failed to add to cart:', error);
      throw error;
    }
  },

  async updateQuantity(productId: number, quantity: number): Promise<CartItem> {
    try {
      const { data } = await apiClient.patch<ApiResponse<CartItem>>('/cart', {
        productId,
        quantity,
      });
      return data.data;
    } catch (error: any) {
      console.error('❌ Failed to update quantity:', error);
      throw error;
    }
  },

  async removeItem(productId: number): Promise<void> {
    try {
      await apiClient.delete(`/cart/item/${productId}`);
    } catch (error: any) {
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        return; // Silently fail for unauthenticated users
      }
      console.error('❌ Failed to remove item:', error);
      throw error;
    }
  },

  async clearCart(): Promise<void> {
    try {
      await apiClient.delete('/cart');
    } catch (error: any) {
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        return;
      }
      console.error('❌ Failed to clear cart:', error);
      throw error;
    }
  },
};