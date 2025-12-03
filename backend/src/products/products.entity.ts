import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { OrderItem } from 'src/orders/order-item.entity';
import { User } from 'src/user/user.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn() id: number;

  @Column() title: string;

  @Column('decimal', { precision: 10, scale: 2 }) price: number;

  @Column({ default: '' }) description: string;

  @Column({ default: 0 }) stock: number;

  // optional: the user (seller or admin) who created the product
  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  owner: User;

  @OneToMany(() => OrderItem, (oi:OrderItem) => oi.product)
  orderItems: OrderItem[];
}
