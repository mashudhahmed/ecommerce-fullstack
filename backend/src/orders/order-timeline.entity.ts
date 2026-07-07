// src/orders/order-timeline.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Order } from './order.entity';
import { User } from '../user/user.entity';

@Entity('order_timeline')
export class OrderTimeline {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  order!: Order;

  @Column()
  orderId!: number;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @Column()
  action!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}