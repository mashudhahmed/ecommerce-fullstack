// hooks/useExport.ts
import { useState } from 'react';
import { exportService, ExportFormat } from '@/services/export.service';
import { toast } from 'sonner';

export function useExport() {
  const [loading, setLoading] = useState(false);

  const exportData = async (
    type: 'users' | 'orders' | 'products' | 'analytics',
    format: ExportFormat = 'excel',
    filters?: any
  ) => {
    setLoading(true);
    try {
      let blob: Blob;
      let filename: string;

      switch (type) {
        case 'users':
          blob = await exportService.exportUsers(format, filters);
          filename = exportService.getFilename(format, 'users');
          break;
        case 'orders':
          blob = await exportService.exportOrders(format, filters);
          filename = exportService.getFilename(format, 'orders');
          break;
        case 'products':
          blob = await exportService.exportProducts(format, filters);
          filename = exportService.getFilename(format, 'products');
          break;
        case 'analytics':
          blob = await exportService.exportAnalytics(format, filters);
          filename = exportService.getFilename(format, 'analytics');
          break;
        default:
          throw new Error('Invalid export type');
      }

      exportService.downloadBlob(blob, filename);
      toast.success(`${type} exported successfully`);
    } catch (error: any) {
      let message = error?.message;
      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          if (json?.message) message = json.message;
        } catch {
          // fallback to error.message
        }
      } else if (error?.response?.data?.message) {
        message = error.response.data.message;
      }
      toast.error(message || `Failed to export ${type}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    exportData,
    loading,
  };
}