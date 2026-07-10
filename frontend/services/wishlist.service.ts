// services/wishlist.service.ts
import { apiClient } from '@/lib/api-client';
import { ApiResponse, Product } from '@/types';

export interface WishlistItem {
  id: number;
  product: Product;
  createdAt: string;
}

export interface WishlistResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const wishlistService = {
  async getWishlist(page: number = 1, limit: number = 20): Promise<WishlistResponse> {
    const { data } = await apiClient.get<ApiResponse<WishlistResponse>>(
      `/wishlist?page=${page}&limit=${limit}`
    );
    return data.data;
  },

  async addToWishlist(productId: number): Promise<WishlistItem> {
    const { data } = await apiClient.post<ApiResponse<WishlistItem>>('/wishlist', { productId });
    return data.data;
  },

  async removeFromWishlist(productId: number): Promise<void> {
    await apiClient.delete(`/wishlist/${productId}`);
  },

  async isInWishlist(productId: number): Promise<boolean> {
    const { data } = await apiClient.get<ApiResponse<boolean>>(`/wishlist/check/${productId}`);
    return data.data;
  },

  async getWishlistCount(): Promise<number> {
    const { data } = await apiClient.get<ApiResponse<number>>('/wishlist/count');
    return data.data;
  },

  async clearWishlist(): Promise<void> {
    await apiClient.delete('/wishlist');
  },
};