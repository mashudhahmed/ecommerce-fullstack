// src/auth/token-blacklist.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('token_blacklist')
export class TokenBlacklist {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  @Index()
  token!: string;

  @Column({ type: 'timestamp' })
  @Index()
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'int', nullable: true })
  @Index()
  userId?: number;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'logout' })
  reason?: string;

  // Helper method
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
