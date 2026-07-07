import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { Order } from '../orders/order.entity';
import { Product } from '../products/products.entity';

export enum UserRole {
  USER = 'user',
  VENDOR = 'vendor',
  ADMIN = 'admin',
  SUPER_ADMIN = 'superadmin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @Column({ length: 100 })
  @Expose()
  name!: string;

  @Column({ unique: true })
  @Index()
  @Expose()
  email!: string;

  @Exclude()
  @Column({ select: false })
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  @Expose()
  role!: UserRole;

  @Column({ default: false })
  @Expose()
  isVerified!: boolean;

  @Column({ default: false })
  @Expose()
  isVendorApproved!: boolean;

  @Column({ default: false })
  @Expose()
  isVendorRejected!: boolean;

  // Widened to accept null: the column is nullable at the DB level, and
  // approveVendor()/rejectVendor() explicitly clear or set this value,
  // so the TS type needs to match what TypeORM actually returns/accepts.
  @Column({ nullable: true, type: 'text' })
  @Expose()
  vendorRejectionReason?: string | null;

  @Column({ nullable: true })
  @Expose()
  vendorBusinessName?: string;

  @Column({ nullable: true, type: 'text' })
  @Expose()
  vendorBusinessDescription?: string;

  @Column({ nullable: true })
  @Expose()
  vendorPhoneNumber?: string;

  @Column({ nullable: true, type: 'text' })
  @Expose()
  vendorAddress?: string;

  @Column({ nullable: true })
  @Expose()
  vendorBusinessRegistration?: string;

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

  @Exclude()
  @Column({ type: 'varchar', length: 64, nullable: true })
  resetTokenHash: string | null = null;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry: Date | null = null;

  @Exclude()
  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => Order, (order) => order.user)
  @Expose()
  orders!: Order[];

  @OneToMany(() => Product, (product) => product.owner)
  @Expose()
  products!: Product[];

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;

  // Helper methods
  isSuperAdmin(): boolean {
    return this.role === UserRole.SUPER_ADMIN;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.SUPER_ADMIN;
  }

  isVendor(): boolean {
    return this.role === UserRole.VENDOR;
  }

  isCustomer(): boolean {
    return this.role === UserRole.USER;
  }

  canApproveVendors(): boolean {
    return this.isAdmin() || this.isSuperAdmin();
  }

  canManageProducts(): boolean {
    return this.isVendor() || this.isAdmin() || this.isSuperAdmin();
  }

  canManageUsers(): boolean {
    return this.isAdmin() || this.isSuperAdmin();
  }
}