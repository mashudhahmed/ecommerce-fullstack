// frontend/services/chat.service.ts
import { apiClient, unwrapData } from '@/lib/api-client';
import { ChatMessage, ChatThread } from '@/types';

export const chatService = {
  async sendMessage(data: {
    recipientId: number;
    content: string;
    orderId?: number;
    productId?: number;
  }): Promise<ChatMessage> {
    const response = await apiClient.post('/chat/send', data);
    return unwrapData<ChatMessage>(response.data);
  },

  async getConversation(partnerId: number): Promise<ChatMessage[]> {
    const response = await apiClient.get(`/chat/conversation/${partnerId}`);
    return unwrapData<ChatMessage[]>(response.data);
  },

  async getThreads(): Promise<ChatThread[]> {
    const response = await apiClient.get('/chat/threads');
    return unwrapData<ChatThread[]>(response.data);
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/chat/unread-count');
    const data = unwrapData<{ count: number }>(response.data);
    return data?.count || 0;
  },
};
