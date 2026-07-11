// backend/src/products/products.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { User } from '../user/user.entity';
import { Expose } from 'class-transformer';
import { Category } from '../categories/category.entity';
import { ProductImage } from './product-image.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('products')
@Index(['ownerId', 'isActive'])
@Index(['categoryId', 'isActive'])
export class Product {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @Column()
  @Expose()
  title!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @Expose()
  price!: number;

  @Column({ default: '' })
  @Expose()
  description!: string;

  @Column({ default: 0 })
  @Expose()
  stock!: number;

  @Column({ nullable: true })
  @Expose()
  imageUrl?: string;

  @Column({ default: true })
  @Expose()
  isActive!: boolean;

  // ✅ Category Relation (Required)
  @ManyToOne(() => Category, (category) => category.products, { nullable: false })
  @Expose()
  category!: Category;

  @Column()
  categoryId!: number;

  // ✅ Additional Fields
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @Expose()
  compareAtPrice?: number;

  @Column({ nullable: true })
  @Expose()
  sku?: string;

  @Column({ default: false })
  @Expose()
  isTrending!: boolean;

  @Column({ default: false })
  @Expose()
  isNew!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  @Expose()
  additionalImages?: string[];

  // ✅ Rating Fields
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  @Expose()
  averageRating!: number;

  @Column({ default: 0 })
  @Expose()
  totalReviews!: number;

  // ✅ Owner Relation
  @ManyToOne(() => User, (u) => u.products, { nullable: true, eager: true })
  @Expose()
  owner?: User;

  @Column({ nullable: true })
  ownerId?: number;

  // ✅ Relations
  @OneToMany(() => OrderItem, (oi) => oi.product)
  orderItems!: OrderItem[];

  @OneToMany(() => ProductImage, (image) => image.product, { cascade: true })
  @Expose()
  images!: ProductImage[];

  @OneToMany(() => ProductVariant, (variant) => variant.product, { cascade: true })
  @Expose()
  variants!: ProductVariant[];

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;

  // Helper methods
  isInStock(quantity: number): boolean {
    return this.stock >= quantity;
  }

  reduceStock(quantity: number): void {
    if (!this.isInStock(quantity)) {
      throw new Error(`Insufficient stock for product ${this.title}`);
    }
    this.stock -= quantity;
  }

  getDiscountedPrice(): number | null {
    if (this.compareAtPrice && this.compareAtPrice > this.price) {
      return this.compareAtPrice;
    }
    return null;
  }

  getDiscountPercentage(): number | null {
    if (this.compareAtPrice && this.compareAtPrice > this.price) {
      return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
    }
    return null;
  }
}