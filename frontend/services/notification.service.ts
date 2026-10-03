import { apiClient } from '@/lib/api-client';

export interface Notification {
  id: string | number;
  type: string;
  title: string;
  message?: string;
  content?: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface NotificationResponse {
  data: Notification[];
  unread: number;
  total: number;
}

export const notificationService = {
  getNotifications: async (
    page = 1,
    limit = 20,
    unreadOnly = false,
  ): Promise<NotificationResponse> => {
    const { data: res } = await apiClient.get<any>(
      `/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`,
    );
    const raw = res?.data ?? res;
    const items = raw?.data || raw?.items || (Array.isArray(raw) ? raw : []);
    const unread = raw?.unreadCount ?? res?.unreadCount ?? items.filter((n: any) => !n.read).length;
    const mapped = items.map((n: any) => ({
      ...n,
      message: n.message || n.content || '',
    }));
    return {
      data: mapped,
      unread,
      total: raw?.total ?? items.length,
    };
  },

  getUnreadCount: async (): Promise<number> => {
    const { data: res } = await apiClient.get<any>('/notifications/unread-count');
    return res?.data?.unreadCount ?? res?.unreadCount ?? 0;
  },

  markAsRead: async (id: string | number): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },

  deleteNotification: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },
};