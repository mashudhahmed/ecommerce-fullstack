// src/auth/two-factor.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';

export enum TwoFactorMethod {
  AUTHENTICATOR = 'authenticator',
  SMS = 'sms',
  EMAIL = 'email',
}

@Entity('two_factor')
export class TwoFactor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  userId!: number;

  @Column({ nullable: true })
  secret?: string;

  @Column({ default: false })
  isEnabled!: boolean;

  @Column({
    type: 'enum',
    enum: TwoFactorMethod,
    default: TwoFactorMethod.AUTHENTICATOR,
  })
  method!: TwoFactorMethod;

  // ✅ Use jsonb for array storage
  @Column({ type: 'jsonb', nullable: true, default: [] })
  backupCodes: string[] = [];

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}