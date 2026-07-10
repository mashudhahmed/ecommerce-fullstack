// services/cart.service.ts
import { apiClient, unwrapData } from '@/lib/api-client';
import { CartItem, ApiResponse } from '@/types';

interface CartTotal {
  total: number;
  itemCount: number;
  items: any[];
}

export const cartService = {
  // ============================================================
  // GET CART
  // ============================================================
  async getCart(): Promise<CartItem[]> {
    try {
      console.log('📡 Fetching cart...');
      const { data } = await apiClient.get<ApiResponse<CartItem[]>>('/cart');
      console.log('✅ Cart fetched:', data.data);
      return data.data || [];
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      const message = error?.response?.data?.message || error?.message || 'Unknown error';
      
      if (status === 401 || status === 403) {
        console.log('ℹ️ User not authenticated, returning empty cart');
        return [];
      }
      console.error(`❌ Failed to fetch cart (${status}):`, message);
      return [];
    }
  },

  // ============================================================
  // GET CART SUMMARY
  // ============================================================
  async getCartSummary(): Promise<{
    items: CartItem[];
    total: number;
    itemCount: number;
  }> {
    try {
      const { data } = await apiClient.get<ApiResponse<any>>('/cart/summary');
      return data.data || { items: [], total: 0, itemCount: 0 };
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      const message = error?.response?.data?.message || error?.message || 'Unknown error';
      
      if (status === 401 || status === 403) {
        console.log('ℹ️ User not authenticated, returning empty cart summary');
        return { items: [], total: 0, itemCount: 0 };
      }
      console.error(`❌ Failed to fetch cart summary (${status}):`, message);
      return { items: [], total: 0, itemCount: 0 };
    }
  },

  // ============================================================
  // GET CART TOTAL
  // ============================================================
  async getCartTotal(): Promise<CartTotal> {
    try {
      const { data } = await apiClient.get<ApiResponse<CartTotal>>('/cart/total');
      return data.data || { total: 0, itemCount: 0, items: [] };
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      const message = error?.response?.data?.message || error?.message || 'Unknown error';
      
      if (status === 401 || status === 403) {
        return { total: 0, itemCount: 0, items: [] };
      }
      console.error(`❌ Failed to fetch cart total (${status}):`, message);
      return { total: 0, itemCount: 0, items: [] };
    }
  },

  // ============================================================
  // GET CART ITEM COUNT
  // ============================================================
  async getCartItemCount(): Promise<{ count: number }> {
    try {
      const { data } = await apiClient.get<ApiResponse<{ count: number }>>('/cart/count');
      return data.data || { count: 0 };
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      const message = error?.response?.data?.message || error?.message || 'Unknown error';
      
      if (status === 401 || status === 403) {
        return { count: 0 };
      }
      console.error(`❌ Failed to fetch cart count (${status}):`, message);
      return { count: 0 };
    }
  },

  // ============================================================
  // ADD TO CART – ✅ Handle 401 gracefully
  // ============================================================
  async addToCart(productId: number, quantity: number): Promise<CartItem> {
    try {
      console.log('📤 Adding to cart:', { productId, quantity });
      const response = await apiClient.post('/cart', {
        productId,
        quantity,
      });
      const data = unwrapData<CartItem>(response.data);
      console.log('✅ Added to cart:', data);
      return data;
    } catch (error: any) {
      // ✅ Get status and message
      const status = error?.response?.status || error?.statusCode || 500;
      const message = error?.response?.data?.message || error?.message || 'Failed to add item to cart';
      const errors = error?.response?.data?.errors;
      
      // ✅ Log the error
      console.error(`❌ Failed to add to cart (${status}):`, { message, errors });
      
      // ✅ If 401, throw a user-friendly error
      if (status === 401 || status === 403) {
        const authError: any = new Error('Please login to add items to your cart');
        authError.statusCode = status;
        authError.requiresAuth = true;
        throw authError;
      }
      
      // ✅ For other errors, throw with details
      const apiError: any = new Error(message);
      apiError.statusCode = status;
      apiError.errors = errors;
      apiError.originalError = error;
      throw apiError;
    }
  },

  // ============================================================
  // UPDATE QUANTITY – ✅ Handle 401 gracefully
  // ============================================================
  async updateQuantity(productId: number, quantity: number): Promise<CartItem> {
    try {
      console.log('📤 Updating quantity:', { productId, quantity });
      const response = await apiClient.patch('/cart', {
        productId,
        quantity,
      });
      const data = unwrapData<CartItem>(response.data);
      console.log('✅ Quantity updated:', data);
      return data;
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 500;
      const message = error?.response?.data?.message || error?.message || 'Failed to update quantity';
      const errors = error?.response?.data?.errors;
      
      console.error(`❌ Failed to update quantity (${status}):`, { message, errors });
      
      if (status === 401 || status === 403) {
        const authError: any = new Error('Please login to update your cart');
        authError.statusCode = status;
        authError.requiresAuth = true;
        throw authError;
      }
      
      const apiError: any = new Error(message);
      apiError.statusCode = status;
      apiError.errors = errors;
      apiError.originalError = error;
      throw apiError;
    }
  },

  // ============================================================
  // REMOVE ITEM – ✅ Handle 401 gracefully
  // ============================================================
  async removeItem(productId: number): Promise<void> {
    try {
      await apiClient.delete(`/cart/item/${productId}`);
      console.log('✅ Item removed:', productId);
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      const message = error?.response?.data?.message || error?.message || 'Failed to remove item';
      
      if (status === 401 || status === 403) {
        console.log('ℹ️ User not authenticated, skipping remove');
        return;
      }
      
      console.error(`❌ Failed to remove item (${status}):`, message);
      
      const apiError: any = new Error(message);
      apiError.statusCode = status;
      throw apiError;
    }
  },

  // ============================================================
  // CLEAR CART – ✅ Handle 401 gracefully
  // ============================================================
  async clearCart(): Promise<void> {
    try {
      await apiClient.delete('/cart');
      console.log('✅ Cart cleared');
    } catch (error: any) {
      const status = error?.response?.status || error?.statusCode || 'unknown';
      const message = error?.response?.data?.message || error?.message || 'Failed to clear cart';
      
      if (status === 401 || status === 403) {
        console.log('ℹ️ User not authenticated, skipping clear');
        return;
      }
      
      console.error(`❌ Failed to clear cart (${status}):`, message);
      
      const apiError: any = new Error(message);
      apiError.statusCode = status;
      throw apiError;
    }
  },
};