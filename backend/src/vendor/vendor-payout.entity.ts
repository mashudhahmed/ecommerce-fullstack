import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { User } from '../user/user.entity';

export enum PayoutStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

@Entity('vendor_payouts')
@Index(['vendorId', 'status'])
export class VendorPayout {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @Column()
  @Expose()
  vendorId!: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @Expose()
  vendor!: User;

  @Column('decimal', { precision: 12, scale: 2 })
  @Expose()
  amount!: number;

  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.PENDING,
  })
  @Expose()
  status!: PayoutStatus;

  @Column({ default: 'Bank Transfer' })
  @Expose()
  paymentMethod!: string;

  @Column({ type: 'text' })
  @Expose()
  accountDetails!: string;

  @Column({ nullable: true, type: 'text' })
  @Expose()
  adminNotes?: string;

  @Column({ nullable: true })
  @Expose()
  transactionReference?: string;

  @Column({ nullable: true, type: 'timestamp' })
  @Expose()
  processedAt?: Date;

  @ManyToOne(() => User, { nullable: true })
  @Expose()
  processedBy?: User;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}
