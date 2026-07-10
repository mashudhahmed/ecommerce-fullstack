// src/notifications/notification.service.ts
import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationChannel } from './notification.entity';
import { User } from '../user/user.entity';
import { MailerService } from '../mailer/mailer.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';

// Optional Twilio integration – will gracefully fallback if not installed
let twilioClient: any = null;
try {
  // Dynamic import to avoid breaking if twilio is not installed
  const twilio = require('twilio');
  twilioClient = twilio;
} catch {
  // Twilio not installed – SMS will be logged instead of sent
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly twilioAccountSid: string;
  private readonly twilioAuthToken: string;
  private readonly twilioPhoneNumber: string;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly mailerService: MailerService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    // Load Twilio config if available
    this.twilioAccountSid = this.configService.get('twilio.accountSid') || '';
    this.twilioAuthToken = this.configService.get('twilio.authToken') || '';
    this.twilioPhoneNumber = this.configService.get('twilio.phoneNumber') || '';
  }

  // ============================================================
  // CREATE NOTIFICATION
  // ============================================================
  async create(
    userId: number,
    type: NotificationType,
    channel: NotificationChannel,
    title: string,
    content: string,
    data?: Record<string, any>,
  ): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId,
      type,
      channel,
      title,
      content,
      data,
    });

    const saved = await this.notificationRepo.save(notification);
    this.logger.log(`Notification created: ${type} for user ${userId}`);

    // Deliver immediately (fire and forget)
    this.deliver(saved).catch((err) => {
      this.logger.error(`Failed to deliver notification ${saved.id}: ${err.message}`);
    });

    return saved;
  }

  // ============================================================
  // DELIVER NOTIFICATION (route to appropriate channel)
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
        // Already saved to database – no additional delivery needed
        this.logger.debug(`In-app notification ${notification.id} saved`);
        break;
      default:
        this.logger.warn(`Unhandled channel: ${notification.channel}`);
    }
  }

  // ============================================================
  // SEND EMAIL – implemented
  // ============================================================
  private async sendEmail(notification: Notification): Promise<void> {
    try {
      const user = await this.userService.findById(notification.userId);
      if (!user) {
        this.logger.warn(`User ${notification.userId} not found for email notification`);
        return;
      }

      // Use MailerService to send the email
      await this.mailerService.sendMail(
        user.email,
        notification.title,
        notification.content,
      );

      this.logger.log(`Email sent to ${user.email} for notification ${notification.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email for notification ${notification.id}: ${error.message}`);
      // Re-throw so caller can handle
      throw error;
    }
  }

  // ============================================================
  // SEND SMS – implemented with Twilio (optional)
  // ============================================================
  private async sendSMS(notification: Notification): Promise<void> {
    try {
      const user = await this.userService.findById(notification.userId);
      if (!user) {
        this.logger.warn(`User ${notification.userId} not found for SMS notification`);
        return;
      }

      // ✅ FIX: Use vendorPhoneNumber (exists on User entity)
      const phoneNumber = user.vendorPhoneNumber;
      if (!phoneNumber) {
        this.logger.warn(`User ${notification.userId} has no phone number for SMS`);
        return;
      }

      // Check if Twilio is configured
      if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
        this.logger.warn(
          `Twilio not configured – SMS would be sent to ${phoneNumber}: ${notification.content}`,
        );
        return;
      }

      // Send SMS via Twilio
      if (twilioClient) {
        const client = twilioClient(this.twilioAccountSid, this.twilioAuthToken);
        await client.messages.create({
          body: notification.content,
          to: phoneNumber,
          from: this.twilioPhoneNumber,
        });
        this.logger.log(`SMS sent to ${phoneNumber} for notification ${notification.id}`);
      } else {
        this.logger.warn('Twilio library not installed – SMS not sent');
      }
    } catch (error: any) {
      this.logger.error(`Failed to send SMS for notification ${notification.id}: ${error.message}`);
      // Don't re-throw – SMS failures shouldn't break the flow
    }
  }

  // ============================================================
  // SEND PUSH – placeholder
  // ============================================================
  private async sendPush(notification: Notification): Promise<void> {
    try {
      // Integrate with Firebase Cloud Messaging (FCM) or similar
      // This would require storing device tokens per user
      this.logger.log(`Push notification would be sent for ${notification.id}`);
      // Placeholder – implement when needed
    } catch (error: any) {
      this.logger.error(`Failed to send push for notification ${notification.id}: ${error.message}`);
    }
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
      this.logger.log(`Notification ${id} marked as read by user ${userId}`);
    }
  }

  // ============================================================
  // GET USER NOTIFICATIONS (paginated)
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
  // GET UNREAD COUNT (for UI badges)
  // ============================================================
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, read: false },
    });
  }

  // ============================================================
  // MARK ALL AS READ
  // ============================================================
  async markAllAsRead(userId: number): Promise<void> {
    const result = await this.notificationRepo.update(
      { userId, read: false },
      { read: true, readAt: new Date() },
    );
    this.logger.log(`Marked ${result.affected} notifications as read for user ${userId}`);
  }

  // ============================================================
  // DELETE NOTIFICATION
  // ============================================================
  async deleteNotification(id: number, userId: number): Promise<void> {
    const result = await this.notificationRepo.delete({ id, userId });
    if (result.affected === 0) {
      this.logger.warn(`Notification ${id} not found for user ${userId}`);
    } else {
      this.logger.log(`Notification ${id} deleted by user ${userId}`);
    }
  }

  // ============================================================
  // DELETE ALL NOTIFICATIONS FOR USER
  // ============================================================
  async deleteAllNotifications(userId: number): Promise<void> {
    const result = await this.notificationRepo.delete({ userId });
    this.logger.log(`Deleted ${result.affected} notifications for user ${userId}`);
  }

  // ============================================================
  // CREATE ORDER CONFIRMATION NOTIFICATION (convenience)
  // ============================================================
  async sendOrderConfirmation(
    userId: number,
    orderId: number,
    total: number,
  ): Promise<Notification> {
    return this.create(
      userId,
      NotificationType.ORDER_CONFIRMATION,
      NotificationChannel.EMAIL,
      `Order #${orderId} Confirmed`,
      `Your order #${orderId} for $${total.toFixed(2)} has been confirmed.`,
      { orderId, total },
    );
  }

  // ============================================================
  // CREATE ORDER STATUS UPDATE NOTIFICATION (convenience)
  // ============================================================
  async sendOrderStatusUpdate(
    userId: number,
    orderId: number,
    status: string,
  ): Promise<Notification> {
    return this.create(
      userId,
      NotificationType.ORDER_SHIPPED,
      NotificationChannel.EMAIL,
      `Order #${orderId} Updated`,
      `Your order #${orderId} status has been updated to: ${status.toUpperCase()}.`,
      { orderId, status },
    );
  }

  // ============================================================
  // CREATE VENDOR APPROVAL NOTIFICATION (convenience)
  // ============================================================
  async sendVendorApproved(userId: number): Promise<Notification> {
    return this.create(
      userId,
      NotificationType.VENDOR_APPROVED,
      NotificationChannel.EMAIL,
      'Vendor Account Approved!',
      'Congratulations! Your vendor account has been approved. You can now start listing products.',
      {},
    );
  }

  // ============================================================
  // CREATE VENDOR REJECTION NOTIFICATION (convenience)
  // ============================================================
  async sendVendorRejected(userId: number, reason?: string): Promise<Notification> {
    return this.create(
      userId,
      NotificationType.VENDOR_REJECTED,
      NotificationChannel.EMAIL,
      'Vendor Account Update',
      `Your vendor application has been reviewed. ${reason ? `Reason: ${reason}` : 'Please contact support for details.'}`,
      { reason },
    );
  }
}