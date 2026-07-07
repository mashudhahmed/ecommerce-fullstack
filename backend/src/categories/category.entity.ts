// src/categories/category.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Expose } from 'class-transformer';
import { Product } from '../products/products.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  @Expose()
  id!: number;

  @Column({ unique: true })
  @Expose()
  name!: string;

  @Column({ nullable: true })
  @Expose()
  slug!: string;

  @Column({ nullable: true, type: 'text' })
  @Expose()
  description?: string;

  @Column({ nullable: true })
  @Expose()
  imageUrl?: string;

  @ManyToOne(() => Category, (category) => category.children, { nullable: true })
  @Expose()
  parent?: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children!: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products!: Product[];

  @Column({ default: 0 })
  @Expose()
  sortOrder!: number;

  @Column({ default: true })
  @Expose()
  isActive!: boolean;

  @CreateDateColumn()
  @Expose()
  createdAt!: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt!: Date;
}