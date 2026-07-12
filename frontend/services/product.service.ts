// frontend/services/product.service.ts
import { apiClient, unwrapData } from '@/lib/api-client';
import { Product, PaginatedResponse } from '@/types';

export interface CreateProductData {
  title: string;
  price: number;
  description: string;
  stock: number;
  imageUrl?: string;
  categoryId?: number;
  compareAtPrice?: number;
  sku?: string;
  isTrending?: boolean;
  isNew?: boolean;
  additionalImages?: string[];
}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export const productService = {
  // ============================================================
  // GET PRODUCTS (with filters and pagination)
  // ============================================================
  async getProducts(filters: ProductFilters = {}): Promise<Product[]> {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.inStock !== undefined) params.append('inStock', filters.inStock.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const url = `/products${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      const paginated = unwrapData<PaginatedResponse<Product>>(response.data);
      return paginated?.items || [];
    } catch (error: any) {
      console.error('Failed to fetch products:', error?.message || error);
      return [];
    }
  },

  // ============================================================
  // GET SINGLE PRODUCT – WITH CACHE BUSTING
  // ============================================================
  async getProduct(id: number): Promise<Product | null> {
    try {
      const response = await apiClient.get(`/products/${id}?fresh=true&_t=${Date.now()}`);
      return unwrapData<Product>(response.data) || null;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      console.error(`Failed to fetch product ${id}:`, error?.message || error);
      throw error;
    }
  },

  // ============================================================
  // GET SINGLE PRODUCT WITH NO CACHE
  // ============================================================
  async getProductFresh(id: number): Promise<Product | null> {
    try {
      const response = await apiClient.get(`/products/${id}?fresh=true&_t=${Date.now()}`);
      return unwrapData<Product>(response.data) || null;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      console.error(`Failed to fetch product ${id}:`, error?.message || error);
      throw error;
    }
  },

  // ============================================================
  // GET IN-STOCK PRODUCTS
  // ============================================================
  async getInStockProducts(): Promise<Product[]> {
    try {
      const response = await apiClient.get('/products/in-stock');
      return unwrapData<Product[]>(response.data) || [];
    } catch (error: any) {
      console.error('Failed to fetch in-stock products:', error?.message || error);
      return [];
    }
  },

  // ============================================================
  // GET OUT-OF-STOCK PRODUCTS
  // ============================================================
  async getOutOfStockProducts(): Promise<Product[]> {
    try {
      const response = await apiClient.get('/products/out-of-stock');
      return unwrapData<Product[]>(response.data) || [];
    } catch (error: any) {
      console.error('Failed to fetch out-of-stock products:', error?.message || error);
      return [];
    }
  },

  // ============================================================
  // GET LOW-STOCK PRODUCTS
  // ============================================================
  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    try {
      const response = await apiClient.get(`/products/low-stock?threshold=${threshold}`);
      return unwrapData<Product[]>(response.data) || [];
    } catch (error: any) {
      console.error('Failed to fetch low-stock products:', error?.message || error);
      return [];
    }
  },

  // ============================================================
  // SEARCH PRODUCTS
  // ============================================================
  async searchProducts(query: string, limit: number = 20): Promise<Product[]> {
    try {
      const response = await apiClient.get(
        `/products?search=${encodeURIComponent(query)}&limit=${limit}`
      );
      const paginated = unwrapData<PaginatedResponse<Product>>(response.data);
      return paginated?.items || [];
    } catch (error: any) {
      console.error('Failed to search products:', error?.message || error);
      return [];
    }
  },

  // ============================================================
  // CREATE PRODUCT
  // ============================================================
  async createProduct(productData: CreateProductData): Promise<Product> {
    const response = await apiClient.post('/products', productData);
    return unwrapData<Product>(response.data);
  },

  // ============================================================
  // UPDATE PRODUCT
  // ============================================================
  async updateProduct(id: number, productData: Partial<CreateProductData>): Promise<Product> {
    const response = await apiClient.put(`/products/${id}`, productData);
    return unwrapData<Product>(response.data);
  },

  // ============================================================
  // DELETE PRODUCT (soft delete)
  // ============================================================
  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  // ============================================================
  // PERMANENTLY DELETE PRODUCT (admin only)
  // ============================================================
  async permanentlyDeleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/products/${id}/permanent`);
  },

  // ============================================================
  // BULK UPDATE STOCK (vendor only)
  // ============================================================
  async bulkUpdateStock(updates: { productId: number; stock: number }[]): Promise<void> {
    await apiClient.patch('/products/vendor/bulk-stock', updates);
  },

  // ============================================================
  // GET VENDOR PRODUCTS
  // ============================================================
  async getVendorProducts(): Promise<Product[]> {
    try {
      const response = await apiClient.get('/products/vendor/my');
      return unwrapData<Product[]>(response.data) || [];
    } catch (error: any) {
      console.error('Failed to fetch vendor products:', error?.message || error);
      return [];
    }
  },

  // ============================================================
  // GET VENDOR STATS
  // ============================================================
  async getVendorStats(): Promise<{
    totalProducts: number;
    totalStock: number;
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    try {
      const response = await apiClient.get('/products/vendor/stats');
      return unwrapData(response.data) || {
        totalProducts: 0,
        totalStock: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      };
    } catch (error: any) {
      console.error('Failed to fetch vendor stats:', error?.message || error);
      return {
        totalProducts: 0,
        totalStock: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      };
    }
  },

  // ============================================================
  // GET PRODUCTS WITH FULL PAGINATION (for admin)
  // ============================================================
  async getProductsPaginated(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.inStock !== undefined) params.append('inStock', filters.inStock.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const url = `/products${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return unwrapData<PaginatedResponse<Product>>(response.data) || {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
    } catch (error: any) {
      console.error('Failed to fetch paginated products:', error?.message || error);
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
    }
  },

  // ============================================================
  // GET PRODUCTS BY CATEGORY
  // ============================================================
  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    try {
      const response = await apiClient.get(`/products?categoryId=${categoryId}`);
      const paginated = unwrapData<PaginatedResponse<Product>>(response.data);
      return paginated?.items || [];
    } catch (error: any) {
      console.error('Failed to fetch products by category:', error?.message || error);
      return [];
    }
  },
};