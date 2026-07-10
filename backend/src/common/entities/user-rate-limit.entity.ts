// src/common/entities/user-rate-limit.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('user_rate_limits')
@Index(['userId', 'endpoint'])
export class UserRateLimit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  key!: string;

  @Column()
  userId!: number;

  @Column()
  endpoint!: string;

  @Column({ default: 0 })
  count!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;
}