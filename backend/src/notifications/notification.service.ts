// src/notifications/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification, NotificationType, NotificationChannel } from './notification.entity';
import { User } from '../user/user.entity';
import { MailerService } from '../mailer/mailer.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';

// Optional Twilio integration
let twilioClient: any = null;
try {
  const twilio = require('twilio');
  twilioClient = twilio;
} catch {
  // Twilio not installed
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly twilioAccountSid: string;
  private readonly twilioAuthToken: string;
  private readonly twilioPhoneNumber: string;

  // ============================================================
  // RATE LIMITING CONFIG
  // ============================================================
  private readonly rateLimits = new Map<string, { count: number; resetAt: Date }>();
  private readonly rateLimitConfig = {
    [NotificationChannel.EMAIL]: { limit: 50, window: 60 * 60 * 1000 },
    [NotificationChannel.SMS]: { limit: 10, window: 60 * 60 * 1000 },
    [NotificationChannel.PUSH]: { limit: 100, window: 60 * 60 * 1000 },
    [NotificationChannel.IN_APP]: { limit: 1000, window: 60 * 60 * 1000 },
  };

  // ============================================================
  // RETRY CONFIG
  // ============================================================
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailerService: MailerService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.twilioAccountSid = this.configService.get('twilio.accountSid') || '';
    this.twilioAuthToken = this.configService.get('twilio.authToken') || '';
    this.twilioPhoneNumber = this.configService.get('twilio.phoneNumber') || '';
  }

  // ============================================================
  // CREATE NOTIFICATION WITH RATE LIMITING
  // ============================================================
  async create(
    userId: number,
    type: NotificationType,
    channel: NotificationChannel,
    title: string,
    content: string,
    data?: Record<string, any>,
  ): Promise<Notification> {
    // ✅ Rate limiting check
    if (!this.checkRateLimit(userId, channel)) {
      this.logger.warn(`Rate limit exceeded for user ${userId}, channel ${channel}`);
      throw new Error(`Rate limit exceeded for ${channel} notifications`);
    }

    const notification = this.notificationRepo.create({
      userId,
      type,
      channel,
      title,
      content,
      data,
      read: false,
      deliveryStatus: 'pending',
      deliveryAttempts: 0,
    });

    const saved = await this.notificationRepo.save(notification);
    this.logger.log(`Notification created: ${type} for user ${userId}`);

    // ✅ Deliver with retry mechanism
    this.deliverWithRetry(saved).catch((err) => {
      this.logger.error(`Failed to deliver notification ${saved.id}: ${err.message}`);
    });

    return saved;
  }

  // ============================================================
  // ✅ DELIVERY WITH RETRY MECHANISM
  // ============================================================
  private async deliverWithRetry(
    notification: Notification,
    attempt: number = 0,
  ): Promise<void> {
    try {
      await this.deliver(notification);
      
      // ✅ Mark as delivered
      notification.deliveryStatus = 'delivered';
      notification.deliveredAt = new Date();
      notification.deliveryAttempts = attempt + 1;
      await this.notificationRepo.save(notification);
      
      this.logger.log(`Notification ${notification.id} delivered successfully`);
    } catch (error: any) {
      notification.deliveryAttempts = attempt + 1;
      
      if (attempt < this.MAX_RETRY_ATTEMPTS) {
        // ✅ Retry with exponential backoff
        const delay = this.RETRY_DELAYS[attempt] || 10000;
        this.logger.warn(
          `Notification ${notification.id} failed (attempt ${attempt + 1}/${this.MAX_RETRY_ATTEMPTS}), retrying in ${delay}ms`
        );
        
        await this.sleep(delay);
        return this.deliverWithRetry(notification, attempt + 1);
      } else {
        // ✅ Mark as failed after all retries
        notification.deliveryStatus = 'failed';
        notification.deliveryError = error.message;
        await this.notificationRepo.save(notification);
        
        this.logger.error(`Notification ${notification.id} failed after ${this.MAX_RETRY_ATTEMPTS} attempts`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================
  // ✅ RATE LIMITING CHECK
  // ============================================================
  private checkRateLimit(userId: number, channel: NotificationChannel): boolean {
    const config = this.rateLimitConfig[channel];
    if (!config) return true;

    const key = `${userId}:${channel}`;
    const now = new Date();
    const current = this.rateLimits.get(key);

    if (!current || current.resetAt < now) {
      this.rateLimits.set(key, { count: 1, resetAt: new Date(now.getTime() + config.window) });
      return true;
    }

    if (current.count >= config.limit) {
      return false;
    }

    current.count++;
    return true;
  }

  // ============================================================
  // DELIVER NOTIFICATION
  // ============================================================
  private async deliver(notification: Notification): Promise<void> {
    switch (notification.channel) {
      case NotificationChannel.EMAIL:
        await this.sendEmail(notification);
        break;
      case NotificationChannel.SMS:
        await this.sendSMS(notification);
        break;
      case NotificationChannel.PUSH:
        await this.sendPush(notification);
        break;
      case NotificationChannel.IN_APP:
        this.logger.debug(`In-app notification ${notification.id} saved`);
        break;
      default:
        this.logger.warn(`Unhandled channel: ${notification.channel}`);
    }
  }

  // ============================================================
  // SEND EMAIL
  // ============================================================
  private async sendEmail(notification: Notification): Promise<void> {
    try {
      const user = await this.findUserById(notification.userId);
      if (!user) {
        throw new Error(`User ${notification.userId} not found`);
      }

      await this.mailerService.sendMail(
        user.email,
        notification.title,
        notification.content,
      );

      this.logger.log(`Email sent to ${user.email} for notification ${notification.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  // ============================================================
  // SEND SMS
  // ============================================================
  private async sendSMS(notification: Notification): Promise<void> {
    try {
      const user = await this.findUserById(notification.userId);
      if (!user) {
        throw new Error(`User ${notification.userId} not found`);
      }

      const phoneNumber = user.vendorPhoneNumber;
      if (!phoneNumber) {
        throw new Error(`User ${notification.userId} has no phone number`);
      }

      if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
        this.logger.warn(`Twilio not configured – SMS would be sent to ${phoneNumber}`);
        return;
      }

      if (twilioClient) {
        const client = twilioClient(this.twilioAccountSid, this.twilioAuthToken);
        await client.messages.create({
          body: notification.content,
          to: phoneNumber,
          from: this.twilioPhoneNumber,
        });
        this.logger.log(`SMS sent to ${phoneNumber}`);
      } else {
        throw new Error('Twilio library not installed');
      }
    } catch (error: any) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      throw error;
    }
  }

  // ============================================================
  // SEND PUSH (placeholder - implement FCM)
  // ============================================================
  private async sendPush(notification: Notification): Promise<void> {
    try {
      // ✅ Implement Firebase Cloud Messaging here
      this.logger.log(`Push notification would be sent for ${notification.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to send push: ${error.message}`);
      throw error;
    }
  }

  // ============================================================
  // FIND USER BY ID
  // ============================================================
  private async findUserById(id: number): Promise<User | null> {
    if (!id) return null;
    return this.userRepo.findOne({ where: { id } });
  }

  // ============================================================
  // GET USER NOTIFICATIONS
  // ============================================================
  async getUserNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ): Promise<{
    data: Notification[];
    total: number;
    unread: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: any = { userId };
    if (unreadOnly) {
      where.read = false;
    }

    const [data, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unread = await this.notificationRepo.count({
      where: { userId, read: false },
    });

    return {
      data,
      total,
      unread,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================
  // GET UNREAD COUNT
  // ============================================================
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, read: false },
    });
  }

  // ============================================================
  // MARK AS READ
  // ============================================================
  async markAsRead(id: number, userId: number): Promise<void> {
    const result = await this.notificationRepo.update(
      { id, userId },
      { read: true, readAt: new Date() },
    );

    if (result.affected === 0) {
      this.logger.warn(`Notification ${id} not found for user ${userId}`);
    } else {
      this.logger.log(`Notification ${id} marked as read`);
    }
  }

  // ============================================================
  // MARK ALL AS READ
  // ============================================================
  async markAllAsRead(userId: number): Promise<void> {
    const result = await this.notificationRepo.update(
      { userId, read: false },
      { read: true, readAt: new Date() },
    );
    this.logger.log(`Marked ${result.affected} notifications as read`);
  }

  // ============================================================
  // DELETE NOTIFICATION
  // ============================================================
  async deleteNotification(id: number, userId: number): Promise<void> {
    const result = await this.notificationRepo.delete({ id, userId });
    if (result.affected === 0) {
      this.logger.warn(`Notification ${id} not found`);
    } else {
      this.logger.log(`Notification ${id} deleted`);
    }
  }

  // ============================================================
  // DELETE ALL NOTIFICATIONS
  // ============================================================
  async deleteAllNotifications(userId: number): Promise<void> {
    const result = await this.notificationRepo.delete({ userId });
    this.logger.log(`Deleted ${result.affected} notifications`);
  }

  // ============================================================
  // ✅ CLEANUP EXPIRED NOTIFICATIONS (FIXED)
  // ============================================================
  async cleanupOldNotifications(days: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await this.notificationRepo.delete({
      createdAt: LessThan(cutoff),
      read: true,
    });

    this.logger.log(`Cleaned up ${result.affected} old notifications`);
    return result.affected || 0;  // ✅ Return number, not DeleteResult
  }
}