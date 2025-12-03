import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Order } from './order.entity';
import { Product } from 'src/products/products.entity';

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Order, (o:Order) => o.items, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Product, (p: Product) => p.orderItems, { eager: true })
  product: Product;

  @Column('int') quantity: number;

  @Column('decimal', { precision: 10, scale: 2 }) price: number;
}
