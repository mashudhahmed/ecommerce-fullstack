// src/user/user-preference.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;

  @Column({ default: false })
  emailNotifications!: boolean;

  @Column({ default: false })
  smsNotifications!: boolean;

  @Column({ default: 'en' })
  language!: string;

  @Column({ default: 'light' })
  theme!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}