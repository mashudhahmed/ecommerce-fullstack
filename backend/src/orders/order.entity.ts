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
import { Expose } from 'class-transformer';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
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

  @Column('decimal', { precision: 12, scale: 2 })
  @Expose()
  total!: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  @Expose()
  status!: OrderStatus;

  @Column({ nullable: true })
  @Expose()
  shippingAddress?: string;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}