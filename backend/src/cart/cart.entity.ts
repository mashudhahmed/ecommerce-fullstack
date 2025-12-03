import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { User } from 'src/user/user.entity';
import { Product } from 'src/products/products.entity';

@Entity()
export class CartItem {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => User, (u:User) => u.id, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Product, (p) => p.id, { eager: true })
  product: Product;

  @Column({ type: 'int', default: 1 }) quantity: number;
}
