import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../products/products.entity';
import { Expose } from 'class-transformer';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @ManyToOne(() => User, (u) => u.id, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Product, { eager: true })
  @Expose()
  product!: Product;

  @Column({ type: 'int', default: 1 })
  @Expose()
  quantity!: number;

  @Expose()
  get subtotal(): number {
    return this.product.price * this.quantity;
  }
}