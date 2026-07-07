// src/wishlist/wishlist.entity.ts
import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Expose } from 'class-transformer';
import { User } from '../user/user.entity';
import { Product } from '../products/products.entity';

@Entity('wishlist')
@Index(['user', 'product'], { unique: true })
export class WishlistItem {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @ManyToOne(() => User, { eager: true })
  @Expose()
  user!: User;

  @ManyToOne(() => Product, { eager: true })
  @Expose()
  product!: Product;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;
}