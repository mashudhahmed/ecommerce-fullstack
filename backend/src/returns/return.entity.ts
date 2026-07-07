// src/returns/return.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Expose } from 'class-transformer';
import { Order } from '../orders/order.entity';
import { User } from '../user/user.entity';

export enum ReturnStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SHIPPED = 'shipped',
  RECEIVED = 'received',
  REFUNDED = 'refunded',
  COMPLETED = 'completed',
}

export enum ReturnReason {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
  DAMAGED = 'damaged',
  NOT_AS_DESCRIBED = 'not_as_described',
  CHANGE_OF_MIND = 'change_of_mind',
  OTHER = 'other',
}

@Entity('returns')
export class Return {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @ManyToOne(() => Order)
  @Expose()
  order!: Order;

  @ManyToOne(() => User)
  @Expose()
  user!: User;

  @Column({ type: 'jsonb' })
  @Expose()
  items!: {
    productId: number;
    productName: string;
    quantity: number;
    price: number;
  }[];

  @Column({
    type: 'enum',
    enum: ReturnReason,
  })
  @Expose()
  reason!: ReturnReason;

  @Column({ type: 'text' })
  @Expose()
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  @Expose()
  images?: string[];

  @Column({
    type: 'enum',
    enum: ReturnStatus,
    default: ReturnStatus.PENDING,
  })
  @Expose()
  status!: ReturnStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @Expose()
  refundAmount?: number;

  @Column({ nullable: true })
  @Expose()
  refundTransactionId?: string;

  @Column({ type: 'text', nullable: true })
  @Expose()
  adminNotes?: string;

  @Column({ type: 'text', nullable: true })
  @Expose()
  rejectionReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  approvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  refundedAt?: Date;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}