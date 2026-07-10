// src/notifications/notification.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { User } from '../user/user.entity';

// src/notifications/notification.entity.ts
export enum NotificationType {
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_STATUS_UPDATED = 'order_updated',      // ✅ Add this
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  PROMOTIONAL = 'promotional',
  VENDOR_APPROVED = 'vendor_approved',
  VENDOR_REJECTED = 'vendor_rejected',
  VENDOR_SUSPENDED = 'vendor_suspended',
  VENDOR_ACTIVATED = 'vendor_activated',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'read';

@Entity('notifications')
@Index(['user', 'read'])
@Index(['user', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  userId!: number;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  @Expose()
  type!: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  @Expose()
  channel!: NotificationChannel;

  @Column()
  @Expose()
  title!: string;

  @Column({ type: 'text' })
  @Expose()
  content!: string;

  @Column({ type: 'jsonb', nullable: true })
  @Expose()
  data?: Record<string, any>;

  @Column({ default: false })
  @Expose()
  read!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  readAt?: Date;

  @Column({ 
    type: 'varchar', 
    length: 20, 
    default: 'pending' 
  })
  @Expose()
  deliveryStatus!: DeliveryStatus;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  deliveredAt?: Date;

  @Column({ type: 'int', default: 0 })
  @Expose()
  deliveryAttempts!: number;

  @Column({ type: 'text', nullable: true })
  @Expose()
  deliveryError?: string;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;
}