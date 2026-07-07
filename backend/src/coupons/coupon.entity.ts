// src/coupons/coupon.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Expose } from 'class-transformer';
import { User } from '../user/user.entity';
import { Product } from '../products/products.entity';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  FREE_SHIPPING = 'free_shipping',
}

export enum CouponStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  USED = 'used',
  DISABLED = 'disabled',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @Column({ unique: true })
  @Index()
  @Expose()
  code!: string;

  @Column()
  @Expose()
  name!: string;

  @Column({ type: 'text', nullable: true })
  @Expose()
  description?: string;

  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.PERCENTAGE,
  })
  @Expose()
  discountType!: DiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Expose()
  discountValue!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @Expose()
  maxDiscount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @Expose()
  minOrderAmount?: number;

  @Column({ type: 'timestamp' })
  @Index()
  @Expose()
  validFrom!: Date;

  @Column({ type: 'timestamp' })
  @Index()
  @Expose()
  validUntil!: Date;

  @Column({ default: 0 })
  @Expose()
  usageLimit!: number;

  @Column({ default: 0 })
  @Expose()
  usedCount!: number;

  @Column({ default: 0 })
  @Expose()
  perUserLimit!: number;

  @Column({
    type: 'enum',
    enum: CouponStatus,
    default: CouponStatus.ACTIVE,
  })
  @Expose()
  status!: CouponStatus;

  @ManyToMany(() => User)
  @JoinTable({ name: 'coupon_users' })
  @Expose()
  applicableUsers?: User[];

  @ManyToMany(() => Product)
  @JoinTable({ name: 'coupon_products' })
  @Expose()
  applicableProducts?: Product[];

  @Column({ default: false })
  @Expose()
  isFirstOrderOnly!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  @Expose()
  metadata?: {
    createdBy?: number;
    notes?: string;
  };

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}