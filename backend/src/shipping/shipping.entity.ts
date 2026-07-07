// src/shipping/shipping.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Expose } from 'class-transformer';
import { Order } from '../orders/order.entity';

export enum ShippingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
}

export enum ShippingMethod {
  STANDARD = 'standard',
  EXPRESS = 'express',
  OVERNIGHT = 'overnight',
  SAME_DAY = 'same_day',
  FREE = 'free',
  INTERNATIONAL = 'international',
}

@Entity('shipping')
export class Shipping {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @ManyToOne(() => Order, { eager: true })
  @Expose()
  order!: Order;

  @Column({
    type: 'enum',
    enum: ShippingMethod,
    default: ShippingMethod.STANDARD,
  })
  @Expose()
  method!: ShippingMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Expose()
  cost!: number;

  @Column({
    type: 'enum',
    enum: ShippingStatus,
    default: ShippingStatus.PENDING,
  })
  @Expose()
  status!: ShippingStatus;

  @Column({ nullable: true })
  @Expose()
  trackingNumber?: string;

  @Column({ nullable: true })
  @Expose()
  carrier?: string;

  @Column({ type: 'jsonb', nullable: true })
  @Expose()
  address!: {
    name: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  estimatedDelivery?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  shippedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  deliveredAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  @Expose()
  trackingHistory?: {
    status: ShippingStatus;
    timestamp: Date;
    location?: string;
    notes?: string;
  }[];

  @Column({ type: 'text', nullable: true })
  @Expose()
  notes?: string;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}