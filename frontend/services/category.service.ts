// services/category.service.ts
import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types';
import { fallbackCategories } from '@/lib/fallback-categories';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  parent?: Category;
  children?: Category[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  parentId?: number;
  imageUrl?: string;
  sortOrder?: number;
}

export const categoryService = {
  // ✅ Get all categories with fallback
  async getCategories(): Promise<Category[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<Category[]>>('/categories');
      return data.data || fallbackCategories;
    } catch (error) {
      console.error('❌ Failed to fetch categories:', error);
      return fallbackCategories;
    }
  },

  // ✅ Get category tree with fallback
  async getCategoryTree(): Promise<Category[]> {
    try {
      const { data } = await apiClient.get<ApiResponse<Category[]>>('/categories/tree');
      return data.data || fallbackCategories;
    } catch (error) {
      console.error('❌ Failed to fetch category tree:', error);
      return fallbackCategories;
    }
  },

  // ✅ Get single category
  async getCategory(id: number): Promise<Category | null> {
    try {
      const { data } = await apiClient.get<ApiResponse<Category>>(`/categories/${id}`);
      return data.data || null;
    } catch (error) {
      console.error(`❌ Failed to fetch category ${id}:`, error);
      return null;
    }
  },

  // ✅ Get category by slug
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      const { data } = await apiClient.get<ApiResponse<Category>>(`/categories/slug/${slug}`);
      return data.data || null;
    } catch (error) {
      console.error(`❌ Failed to fetch category by slug ${slug}:`, error);
      return null;
    }
  },

  // ✅ Create category (admin only)
  async createCategory(data: CreateCategoryData): Promise<Category> {
    const { data: response } = await apiClient.post<ApiResponse<Category>>('/categories', data);
    return response.data;
  },

  // ✅ Update category (admin only)
  async updateCategory(id: number, data: Partial<CreateCategoryData>): Promise<Category> {
    const { data: response } = await apiClient.put<ApiResponse<Category>>(`/categories/${id}`, data);
    return response.data;
  },

  // ✅ Delete category (admin only)
  async deleteCategory(id: number): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },

  // ✅ Get category stats (admin only)
  async getCategoryStats(): Promise<{
    total: number;
    active: number;
    rootCategories: number;
  }> {
    try {
      const { data } = await apiClient.get<ApiResponse<any>>('/categories/stats');
      return data.data || { total: 0, active: 0, rootCategories: 0 };
    } catch (error) {
      console.error('❌ Failed to fetch category stats:', error);
      return { total: 0, active: 0, rootCategories: 0 };
    }
  },
};