import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { User } from '../user/user.entity';
import { Expose } from 'class-transformer';
import { Category } from '../categories/category.entity';

@Entity('products')
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

  @ManyToOne(() => User, (u) => u.products, { nullable: true, eager: true })
  @Expose()
  owner?: User;

  @OneToMany(() => OrderItem, (oi) => oi.product)
  orderItems!: OrderItem[];

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;

  // Add after stock field:
@Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
@Expose()
averageRating!: number;

@Column({ default: 0 })
@Expose()
totalReviews!: number;

// Add category relationship:
@ManyToOne(() => Category, (category) => category.products, { nullable: true })
@Expose()
category?: Category;


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
}