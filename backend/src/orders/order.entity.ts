import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from 'src/user/user.entity';
import { OrderItem } from './order-item.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => User, (u:User) => u.id, { eager: true})
  user: User;

  @OneToMany(() => OrderItem, (oi) => oi.order, { cascade: true, eager: true })
  items: OrderItem[];

  @Column('decimal', { precision: 12, scale: 2 }) total: number;

  @Column({ default: 'pending' }) status: string;

  @CreateDateColumn() createdAt: Date;
}
