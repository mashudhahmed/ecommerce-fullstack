import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { User } from '../user/user.entity';

@Entity('vendor_wallets')
export class VendorWallet {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @Column({ unique: true })
  @Index()
  @Expose()
  vendorId!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  @Expose()
  vendor!: User;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  @Expose()
  availableBalance!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  @Expose()
  escrowBalance!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  @Expose()
  totalEarned!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  @Expose()
  totalWithdrawn!: number;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}
