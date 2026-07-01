import { apiClient } from '@/lib/api-client';
import { Product, ApiResponse } from '@/types';

export interface CreateProductData {
  title: string;
  price: number;
  description: string;
  stock: number;
  imageUrl?: string;
}

// ✅ Set to true to use real API
const USE_API = true;

export const productService = {
  async getProducts(): Promise<Product[]> {
    try {
      console.log('📡 Fetching products from API...');
      const { data } = await apiClient.get<ApiResponse<Product[]>>('/products');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch products:', error);
      throw error;
    }
  },

  async getProduct(id: number): Promise<Product | null> {
    try {
      console.log(`📡 Fetching product ${id} from API...`);
      const { data } = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
      return data.data || null;
    } catch (error) {
      console.error(`❌ Failed to fetch product ${id}:`, error);
      throw error;
    }
  },

  async getInStockProducts(): Promise<Product[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<Product[]>>('/products/in-stock');
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch in-stock products:', error);
      throw error;
    }
  },

  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<Product[]>>(
        `/products/low-stock?threshold=${threshold}`
      );
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch low-stock products:', error);
      throw error;
    }
  },

  async createProduct(productData: CreateProductData): Promise<Product | null> {
    try {
      const { data } = await apiClient.post<ApiResponse<Product>>('/products', productData);
      return data.data || null;
    } catch (error) {
      console.error('❌ Failed to create product:', error);
      throw error;
    }
  },

  async updateProduct(id: number, productData: Partial<CreateProductData>): Promise<Product | null> {
    try {
      const { data } = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, productData);
      return data.data || null;
    } catch (error) {
      console.error(`❌ Failed to update product ${id}:`, error);
      throw error;
    }
  },

  async deleteProduct(id: number): Promise<void> {
    try {
      await apiClient.delete(`/products/${id}`);
    } catch (error) {
      console.error(`❌ Failed to delete product ${id}:`, error);
      throw error;
    }
  },
};