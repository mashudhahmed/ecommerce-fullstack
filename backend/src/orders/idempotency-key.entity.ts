// src/orders/idempotency-key.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('idempotency_keys')
@Index(['key', 'userId'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  key!: string;

  @Column()
  userId!: number;

  @Column({ type: 'jsonb', nullable: true })
  response?: any;

  @Column({ nullable: true })
  orderId?: number;

  @Column({ default: 'pending' })
  status!: 'pending' | 'completed' | 'failed';

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;
}