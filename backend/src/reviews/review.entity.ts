// src/reviews/review.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Expose } from 'class-transformer';
import { User } from '../user/user.entity';
import { Product } from '../products/products.entity';

@Entity('reviews')
@Index(['product', 'user'], { unique: true })
export class Review {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @ManyToOne(() => User, { eager: true })
  @Expose()
  user!: User;

  @ManyToOne(() => Product, { eager: true })
  @Expose()
  product!: Product;

  @Column({ type: 'int' })
  @Expose()
  rating!: number; // 1-5

  @Column({ type: 'text' })
  @Expose()
  comment!: string;

  @Column({ nullable: true, type: 'text' })
  @Expose()
  title?: string;

  @Column({ type: 'jsonb', nullable: true })
  @Expose()
  images?: string[];

  @Column({ type: 'jsonb', nullable: true })
  @Expose()
  metadata?: {
    verifiedPurchase?: boolean;
    helpfulCount?: number;
    reportedCount?: number;
  };

  @Column({ default: false })
  @Expose()
  isApproved!: boolean;

  @Column({ default: false })
  @Expose()
  isDeleted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  approvedAt?: Date;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}