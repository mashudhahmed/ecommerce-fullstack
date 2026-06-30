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

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
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