// backend/src/chat/chat.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from '../user/user.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async sendMessage(
    senderId: number,
    recipientId: number,
    content: string,
    orderId?: number,
    productId?: number,
  ): Promise<ChatMessage> {
    if (!content || !content.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }
    if (senderId === recipientId) {
      throw new BadRequestException('Cannot message yourself');
    }

    const [sender, recipient] = await Promise.all([
      this.userRepository.findOne({ where: { id: senderId } }),
      this.userRepository.findOne({ where: { id: recipientId } }),
    ]);

    if (!sender || !recipient) {
      throw new NotFoundException('Sender or recipient not found');
    }

    const message = this.messageRepository.create({
      sender,
      recipient,
      content: content.trim(),
      orderId,
      productId,
      isRead: false,
    });

    const saved = await this.messageRepository.save(message);

    // Real-time delivery to recipient and confirmation to sender
    this.eventsGateway.notifyUser(recipientId.toString(), 'new_chat_message', saved);
    this.eventsGateway.notifyUser(senderId.toString(), 'chat_message_sent', saved);

    return saved;
  }

  async getConversation(
    userId: number,
    partnerId: number,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    const messages = await this.messageRepository
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.sender', 'sender')
      .leftJoinAndSelect('msg.recipient', 'recipient')
      .where(
        '((msg.senderId = :userId AND msg.recipientId = :partnerId) OR (msg.senderId = :partnerId AND msg.recipientId = :userId))',
        { userId, partnerId },
      )
      .orderBy('msg.createdAt', 'ASC')
      .take(limit)
      .getMany();

    // Mark messages as read where current user is recipient
    await this.messageRepository
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ isRead: true })
      .where('recipientId = :userId AND senderId = :partnerId AND isRead = false', {
        userId,
        partnerId,
      })
      .execute();

    return messages;
  }

  async getConversationsList(userId: number): Promise<any[]> {
    // Get unique partner IDs from recent messages
    const recentMessages = await this.messageRepository
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.sender', 'sender')
      .leftJoinAndSelect('msg.recipient', 'recipient')
      .where('msg.senderId = :userId OR msg.recipientId = :userId', { userId })
      .orderBy('msg.createdAt', 'DESC')
      .take(200)
      .getMany();

    const partnerMap = new Map<number, { partner: User; lastMessage: ChatMessage; unreadCount: number }>();

    for (const msg of recentMessages) {
      const partner = msg.sender.id === userId ? msg.recipient : msg.sender;
      if (!partnerMap.has(partner.id)) {
        partnerMap.set(partner.id, {
          partner,
          lastMessage: msg,
          unreadCount: 0,
        });
      }
      if (msg.recipient.id === userId && !msg.isRead) {
        const item = partnerMap.get(partner.id)!;
        item.unreadCount += 1;
      }
    }

    return Array.from(partnerMap.values());
  }

  async getUnreadCount(userId: number): Promise<{ count: number }> {
    const count = await this.messageRepository.count({
      where: { recipient: { id: userId }, isRead: false },
    });
    return { count };
  }
}
