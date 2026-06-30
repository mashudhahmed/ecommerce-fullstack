import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../products/products.entity';
import { Expose } from 'class-transformer';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  order!: Order;

  @ManyToOne(() => Product, { eager: true })
  @Expose()
  product!: Product;

  @Column('int')
  @Expose()
  quantity!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  @Expose()
  price!: number;
}