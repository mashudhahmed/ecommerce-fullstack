// src/auth/login-attempt.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('login_attempts')
@Index(['email', 'ipAddress'])
@Index(['email', 'createdAt'])
export class LoginAttempt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  email!: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ default: false })
  isSuccessful!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}