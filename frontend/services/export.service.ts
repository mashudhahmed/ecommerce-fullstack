// services/export.service.ts
import { apiClient } from '@/lib/api-client';

export type ExportFormat = 'excel' | 'pdf' | 'csv' | 'json';

export const exportService = {
  async exportUsers(
    format: ExportFormat = 'excel',
    filters?: { role?: string; isVerified?: boolean }
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters?.role) params.append('role', filters.role);
    if (filters?.isVerified !== undefined) params.append('isVerified', String(filters.isVerified));

    const response = await apiClient.get(`/export/users?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportOrders(
    format: ExportFormat = 'excel',
    filters?: { status?: string; startDate?: string; endDate?: string }
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get(`/export/orders?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportProducts(
    format: ExportFormat = 'excel',
    filters?: { categoryId?: number; inStock?: boolean }
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters?.categoryId) params.append('categoryId', String(filters.categoryId));
    if (filters?.inStock !== undefined) params.append('inStock', String(filters.inStock));

    const response = await apiClient.get(`/export/products?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportAnalytics(
    format: ExportFormat = 'excel',
    filters?: { startDate?: string; endDate?: string }
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get(`/export/analytics?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  getFilename(format: ExportFormat, prefix: string): string {
    const date = new Date().toISOString().split('T')[0];
    const ext = format === 'excel' ? 'xlsx' : format;
    return `${prefix}_${date}.${ext}`;
  },
};