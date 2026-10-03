import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { User } from '../user/user.entity';

export enum VendorOrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

export enum VendorPayoutStatus {
  ESCROW = 'escrow',
  READY = 'ready',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

@Entity('vendor_orders')
@Index(['vendorId', 'status'])
@Index(['orderId'])
export class VendorOrder {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @Column()
  @Expose()
  orderId!: number;

  @ManyToOne(() => Order, (o) => o.vendorOrders, { onDelete: 'CASCADE' })
  order!: Order;

  @Column()
  @Expose()
  vendorId!: number;

  @ManyToOne(() => User, { eager: true })
  @Expose()
  vendor!: User;

  @OneToMany(() => OrderItem, (oi) => oi.vendorOrder, {
    cascade: true,
    eager: true,
  })
  @Expose()
  items!: OrderItem[];

  @Column({
    type: 'enum',
    enum: VendorOrderStatus,
    default: VendorOrderStatus.PENDING,
  })
  @Expose()
  status!: VendorOrderStatus;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  @Expose()
  subtotal!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  @Expose()
  shippingFee!: number;

  @Column('decimal', { precision: 5, scale: 2, default: 10 })
  @Expose()
  commissionRate!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  @Expose()
  commissionAmount!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  @Expose()
  vendorEarnings!: number;

  @Column({ nullable: true })
  @Expose()
  carrierName?: string;

  @Column({ nullable: true })
  @Expose()
  trackingNumber?: string;

  @Column({ nullable: true })
  @Expose()
  trackingUrl?: string;

  @Column({ nullable: true, type: 'timestamp' })
  @Expose()
  estimatedDeliveryDate?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  @Expose()
  shippedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  @Expose()
  deliveredAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  @Expose()
  cancelledAt?: Date;

  @Column({ nullable: true })
  @Expose()
  cancellationReason?: string;

  @Column({
    type: 'enum',
    enum: VendorPayoutStatus,
    default: VendorPayoutStatus.ESCROW,
  })
  @Expose()
  payoutStatus!: VendorPayoutStatus;

  @Column({ nullable: true, type: 'text' })
  @Expose()
  notes?: string;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}
