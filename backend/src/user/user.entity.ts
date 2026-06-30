import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { Order } from '../orders/order.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @Column()
  @Expose()
  name!: string;

  @Column({ unique: true })
  @Expose()
  email!: string;

  @Exclude()
  @Column()
  password!: string;

  @Exclude()
  @Column({ default: 'user' })
  role!: string;

  @Exclude()
  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Exclude()
  @Column({ type: 'varchar', length: 6, nullable: true })
  verificationCode: string | null = null;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  verificationCodeExpiry: Date | null = null;

  @Exclude()
  @Column({ type: 'varchar', length: 6, nullable: true })
  resetCode: string | null = null;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  resetCodeExpiry: Date | null = null;

  @OneToMany(() => Order, (order) => order.user)
  @Expose()
  orders!: Order[];

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;

  isSuperAdmin(): boolean {
    return this.role === 'superadmin';
  }

  isAdmin(): boolean {
    return this.role === 'admin' || this.role === 'superadmin';
  }
}