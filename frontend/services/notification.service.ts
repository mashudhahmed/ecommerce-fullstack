// services/notification.service.ts
import { apiClient, unwrapData } from '@/lib/api-client';
import { ApiResponse } from '@/types/api';

export interface Notification {
  id: string;
  type: 'order' | 'vendor' | 'system' | 'message';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export const notificationService = {
  // ✅ Get notifications
  async getNotifications(page: number = 1, limit: number = 20): Promise<{
    data: Notification[];
    total: number;
    unread: number;
  }> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/notifications', {
        params: { page, limit },
      });
      const data = unwrapData<any>(response.data);
      if (!data) return { data: [], total: 0, unread: 0 };
      if (Array.isArray(data)) {
        return {
          data,
          total: data.length,
          unread: data.filter((n: any) => !n.read).length,
        };
      }
      return {
        data: data.data || [],
        total: data.total || 0,
        unread: data.unread ?? data.unreadCount ?? 0,
      };
    } catch (error: any) {
      const status = error?.statusCode || error?.response?.status;
      if (status === 401 || status === 403) {
        // Expected when user is not authenticated or session has expired
        return { data: [], total: 0, unread: 0 };
      }
      console.error('Failed to fetch notifications:', error?.message || error);
      return { data: [], total: 0, unread: 0 };
    }
  },

  // ✅ Mark notification as read
  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (error: any) {
      const status = error?.statusCode || error?.response?.status;
      if (status === 401 || status === 403) return;
      console.error('Failed to mark notification as read:', error?.message || error);
      throw error;
    }
  },

  // ✅ Mark all as read
  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch('/notifications/read-all');
    } catch (error: any) {
      const status = error?.statusCode || error?.response?.status;
      if (status === 401 || status === 403) return;
      console.error('Failed to mark all as read:', error?.message || error);
      throw error;
    }
  },

  // ✅ Get unread count
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      const data = unwrapData<{ count: number }>(response.data);
      return data?.count || 0;
    } catch (error: any) {
      const status = error?.statusCode || error?.response?.status;
      if (status === 401 || status === 403) return 0;
      console.error('Failed to get unread count:', error?.message || error);
      return 0;
    }
  },

  // ✅ DELETE notification - NEW
  async deleteNotification(id: string): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${id}`);
    } catch (error: any) {
      const status = error?.statusCode || error?.response?.status;
      if (status === 401 || status === 403) return;
      console.error('Failed to delete notification:', error?.message || error);
      throw error;
    }
  },

  // ✅ Delete all notifications - NEW
  async deleteAllNotifications(): Promise<void> {
    try {
      await apiClient.delete('/notifications');
    } catch (error: any) {
      const status = error?.statusCode || error?.response?.status;
      if (status === 401 || status === 403) return;
      console.error('Failed to delete all notifications:', error?.message || error);
      throw error;
    }
  },
};