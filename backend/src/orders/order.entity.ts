// src/orders/order.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { OrderItem } from './order-item.entity';
import { VendorOrder } from './vendor-order.entity';
import { Expose } from 'class-transformer';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  PARTIALLY_SHIPPED = 'partially_shipped',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @ManyToOne(() => User, (u) => u.orders, { eager: true })
  @Expose()
  user!: User;

  @OneToMany(() => OrderItem, (oi) => oi.order, {
    cascade: true,
    eager: true,
  })
  @Expose()
  items!: OrderItem[];

  @OneToMany(() => VendorOrder, (vo) => vo.order, {
    cascade: true,
    eager: true,
  })
  @Expose()
  vendorOrders!: VendorOrder[];

  @Column('decimal', { precision: 12, scale: 2 })
  @Expose()
  total!: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  @Expose()
  status!: OrderStatus;

  @Column({ type: 'text', nullable: true })
  @Expose()
  shippingAddress?: string;

  // ✅ Added missing columns
  @Column({ nullable: true, type: 'timestamp' })
  @Expose()
  cancelledAt?: Date;

  @Column({ nullable: true })
  @Expose()
  cancellationReason?: string;

  @ManyToOne(() => User, { nullable: true })
  @Expose()
  cancelledBy?: User;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}
