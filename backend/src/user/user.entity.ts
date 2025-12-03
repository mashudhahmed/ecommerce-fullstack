import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Order } from 'src/orders/order.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn() 
  id: number;

  @Column() 
  name: string;

  @Column({ unique: true }) 
  email: string;

  @Exclude()
  @Column()
  password: string;

  // ✅ UPDATED: Added 'superadmin' role option
  @Exclude()
  @Column({ default: 'user' }) 
  role: string;

  @OneToMany(() => Order, (order) => order.user) 
  orders: Order[];

  @Exclude()
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Exclude()
  @Column({ type: 'varchar', length: 6, nullable: true })
  verificationCode: string;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  verificationCodeExpiry: Date;

  @Exclude()
  @Column({ type: 'varchar', length: 6, nullable: true })
  resetCode: string;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  resetCodeExpiry: Date;
}