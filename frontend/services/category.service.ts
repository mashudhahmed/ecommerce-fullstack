// services/category.service.ts
import { apiClient, unwrapData } from '@/lib/api-client';
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
      const response = await apiClient.get<ApiResponse<Category[]>>('/categories');
      const categories = unwrapData<Category[]>(response.data);
      if (Array.isArray(categories) && categories.length > 0) {
        return categories;
      }
      return fallbackCategories;
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error('❌ Failed to fetch categories:', message);
      return fallbackCategories;
    }
  },

  // ✅ Get category tree with fallback
  async getCategoryTree(): Promise<Category[]> {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>('/categories/tree');
      const tree = unwrapData<Category[]>(response.data);
      if (Array.isArray(tree) && tree.length > 0) {
        return tree;
      }
      return fallbackCategories;
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error('❌ Failed to fetch category tree:', message);
      return fallbackCategories;
    }
  },

  // ✅ Get single category
  async getCategory(id: number): Promise<Category | null> {
    try {
      const response = await apiClient.get<ApiResponse<Category>>(`/categories/${id}`);
      return unwrapData<Category>(response.data) || null;
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error(`❌ Failed to fetch category ${id}:`, message);
      return null;
    }
  },

  // ✅ Get category by slug
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      const response = await apiClient.get<ApiResponse<Category>>(`/categories/slug/${slug}`);
      return unwrapData<Category>(response.data) || null;
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error(`❌ Failed to fetch category by slug ${slug}:`, message);
      return null;
    }
  },

  // ✅ Create category (admin only)
  async createCategory(data: CreateCategoryData): Promise<Category> {
    const response = await apiClient.post<ApiResponse<Category>>('/categories', data);
    return unwrapData<Category>(response.data);
  },

  // ✅ Update category (admin only)
  async updateCategory(id: number, data: Partial<CreateCategoryData>): Promise<Category> {
    const response = await apiClient.put<ApiResponse<Category>>(`/categories/${id}`, data);
    return unwrapData<Category>(response.data);
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
      const response = await apiClient.get<ApiResponse<any>>('/categories/stats');
      return unwrapData<any>(response.data) || { total: 0, active: 0, rootCategories: 0 };
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error('❌ Failed to fetch category stats:', message);
      return { total: 0, active: 0, rootCategories: 0 };
    }
  },
};