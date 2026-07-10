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

  @Column({ nullable: true, type: 'text' })
  secret?: string | null;

  @Column({ default: false })
  isEnabled!: boolean;

  @Column({
    type: 'enum',
    enum: TwoFactorMethod,
    default: TwoFactorMethod.EMAIL,
  })
  method!: TwoFactorMethod;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  backupCodes!: string[];

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true, type: 'varchar', length: 10 })
  tempCode?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  tempCodeExpiry?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}