// services/notification.service.ts
import { apiClient } from '@/lib/api-client';
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
      const { data } = await apiClient.get<ApiResponse<any>>('/notifications', {
        params: { page, limit },
      });
      return data.data || { data: [], total: 0, unread: 0 };
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return { data: [], total: 0, unread: 0 };
    }
  },

  // ✅ Mark notification as read
  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  },

  // ✅ Mark all as read
  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch('/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  },

  // ✅ Get unread count
  async getUnreadCount(): Promise<number> {
    try {
      const { data } = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      return data.data.count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  },

  // ✅ DELETE notification - NEW
  async deleteNotification(id: string): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${id}`);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  },

  // ✅ Delete all notifications - NEW
  async deleteAllNotifications(): Promise<void> {
    try {
      await apiClient.delete('/notifications');
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      throw error;
    }
  },
};