import { apiClient } from '@/lib/api-client';
import { Product, ApiResponse } from '@/types';

export interface SearchResult {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  aggs: {
    categories: { id: number; count: number }[];
    priceRanges: { from: number; to: number; count: number }[];
  };
}

export const searchService = {
  // ✅ Search products with filters
  async search(query: string, filters: {
    page?: number;
    limit?: number;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    minRating?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<SearchResult> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.inStock !== undefined) params.append('inStock', filters.inStock.toString());
      if (filters.minRating) params.append('minRating', filters.minRating.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const { data } = await apiClient.get<ApiResponse<SearchResult>>(
        `/search?${params.toString()}`
      );
      return data.data || { data: [], total: 0, page: 1, limit: 20, aggs: { categories: [], priceRanges: [] } };
    } catch (error) {
      console.error('❌ Failed to search:', error);
      return { data: [], total: 0, page: 1, limit: 20, aggs: { categories: [], priceRanges: [] } };
    }
  },

  // ✅ Autocomplete suggestions
  async autocomplete(query: string): Promise<string[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<string[]>>(
        `/search/autocomplete?q=${encodeURIComponent(query)}`
      );
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to get autocomplete:', error);
      return [];
    }
  },

  // ✅ Get popular search terms
  async getPopularTerms(): Promise<string[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<string[]>>('/search/popular');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to get popular terms:', error);
      return [];
    }
  },

  // ✅ Reindex all products (admin only)
  async reindex(): Promise<void> {
    await apiClient.get('/search/reindex');
  },
};