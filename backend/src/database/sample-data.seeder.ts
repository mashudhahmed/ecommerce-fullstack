// src/database/sample-data.seeder.ts
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../user/user.entity';
import { Category } from '../categories/category.entity';
import { Product } from '../products/products.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SampleDataSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SampleDataSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    // Check if we already have products – if yes, skip
    const productCount = await this.productRepo.count();
    if (productCount > 0) {
      this.logger.log('Sample data already exists, skipping seeding');
      return;
    }

    await this.seed();
  }

  async seed() {
    this.logger.log('🌱 Seeding sample products and categories...');

    try {
      // 1. Find or create a vendor user
      let vendor = await this.userRepo.findOne({
        where: { email: 'vendor@marketplace.com' },
      });
      if (!vendor) {
        vendor = await this.userRepo.findOne({
          where: { email: 'sample-vendor@example.com' },
        });
      }
      if (!vendor) {
        const hashedPassword = await bcrypt.hash('Password@123', 12);
        vendor = this.userRepo.create({
          name: 'ElectroTech Verified Store',
          email: 'vendor@marketplace.com',
          password: hashedPassword,
          role: UserRole.VENDOR,
          isVerified: true,
          isVendorApproved: true,
          vendorBusinessName: 'ElectroTech Solutions',
          vendorBusinessDescription:
            'Premier authorized merchant for smartphones, computing hardware, and accessories.',
          vendorPhoneNumber: '+1 (555) 019-8234',
          vendorAddress: '450 Innovation Way, Tech District, CA',
        });
        vendor = await this.userRepo.save(vendor);
        this.logger.log('✅ Vendor created');
      }

      // 2. Create categories
      const categories = [
        { name: 'Electronics', description: 'Devices and gadgets' },
        { name: 'Clothing', description: 'Fashion and apparel' },
        { name: 'Books', description: 'Books and literature' },
        {
          name: 'Home & Garden',
          description: 'Home improvement and gardening',
        },
        { name: 'Toys & Games', description: 'Fun for all ages' },
      ];

      const categoryMap: Record<string, Category> = {};
      for (const catData of categories) {
        let category = await this.categoryRepo.findOne({
          where: { name: catData.name },
        });
        if (!category) {
          category = this.categoryRepo.create({
            name: catData.name,
            slug: catData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: catData.description,
            isActive: true,
          });
          category = await this.categoryRepo.save(category);
        }
        categoryMap[catData.name] = category;
        this.logger.log(`✅ Category "${category.name}" ready`);
      }

      // 3. Create products (20 sample products)

      // ✅ High-resolution, reliable Unsplash product photography
      const productImagesMap: Record<string, string> = {
        'Smartphone X': 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80',
        'Wireless Headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        'Smartwatch Pro': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
        'Bluetooth Speaker': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
        'Laptop Stand': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
        'T-Shirt (Cotton)': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
        'Jeans (Slim Fit)': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80',
        'Jacket (Waterproof)': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80',
        'Sneakers (Running)': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
        'Sunglasses': 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
        'Fiction Novel': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&auto=format&fit=crop&q=80',
        'Cookbook': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
        'Science Textbook': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80',
        "Children's Picture Book": 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
        'Gardening Tools Set': 'https://images.unsplash.com/photo-1617576683096-00fc8eecb3af?w=800&auto=format&fit=crop&q=80',
        'Plant Pots (Set of 3)': 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&auto=format&fit=crop&q=80',
        'Outdoor String Lights': 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
        'Board Game': 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&auto=format&fit=crop&q=80',
        'Puzzle (1000 pieces)': 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=800&auto=format&fit=crop&q=80',
        'Action Figure': 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
      };

      const buildImageUrl = (title: string): string => {
        return (
          productImagesMap[title] ||
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
        );
      };

      const productsData = [
        {
          title: 'Smartphone X',
          price: 699.99,
          stock: 50,
          category: 'Electronics',
        },
        {
          title: 'Wireless Headphones',
          price: 99.99,
          stock: 120,
          category: 'Electronics',
        },
        {
          title: 'Smartwatch Pro',
          price: 249.99,
          stock: 30,
          category: 'Electronics',
        },
        {
          title: 'Bluetooth Speaker',
          price: 59.99,
          stock: 80,
          category: 'Electronics',
        },
        {
          title: 'Laptop Stand',
          price: 29.99,
          stock: 200,
          category: 'Electronics',
        },
        {
          title: 'T-Shirt (Cotton)',
          price: 19.99,
          stock: 150,
          category: 'Clothing',
        },
        {
          title: 'Jeans (Slim Fit)',
          price: 49.99,
          stock: 100,
          category: 'Clothing',
        },
        {
          title: 'Jacket (Waterproof)',
          price: 89.99,
          stock: 45,
          category: 'Clothing',
        },
        {
          title: 'Sneakers (Running)',
          price: 79.99,
          stock: 60,
          category: 'Clothing',
        },
        { title: 'Sunglasses', price: 39.99, stock: 90, category: 'Clothing' },
        { title: 'Fiction Novel', price: 14.99, stock: 200, category: 'Books' },
        { title: 'Cookbook', price: 24.99, stock: 75, category: 'Books' },
        {
          title: 'Science Textbook',
          price: 59.99,
          stock: 40,
          category: 'Books',
        },
        {
          title: "Children's Picture Book",
          price: 9.99,
          stock: 150,
          category: 'Books',
        },
        {
          title: 'Gardening Tools Set',
          price: 39.99,
          stock: 35,
          category: 'Home & Garden',
        },
        {
          title: 'Plant Pots (Set of 3)',
          price: 19.99,
          stock: 80,
          category: 'Home & Garden',
        },
        {
          title: 'Outdoor String Lights',
          price: 29.99,
          stock: 60,
          category: 'Home & Garden',
        },
        {
          title: 'Board Game',
          price: 34.99,
          stock: 50,
          category: 'Toys & Games',
        },
        {
          title: 'Puzzle (1000 pieces)',
          price: 14.99,
          stock: 100,
          category: 'Toys & Games',
        },
        {
          title: 'Action Figure',
          price: 24.99,
          stock: 70,
          category: 'Toys & Games',
        },
      ];

      const productsToInsert = productsData.map((p, index) => {
        const category = categoryMap[p.category];
        return this.productRepo.create({
          title: p.title,
          price: p.price,
          description: `${p.title} – a great product from our sample collection.`,
          stock: p.stock,
          owner: vendor,
          category: category || null,
          isActive: true,
          averageRating: 0,
          totalReviews: 0,
          imageUrl: buildImageUrl(p.title),
        });
      });

      await this.productRepo.save(productsToInsert);
      this.logger.log(`✅ ${productsToInsert.length} sample products created`);

      // 4. Seed some reviews (optional)
      // You can add a few default reviews if you have a review repository.
      // For simplicity, we skip but you can extend.

      this.logger.log('✅ Sample data seeding completed successfully!');
    } catch (error) {
      this.logger.error('❌ Failed to seed sample data:', error);
    }
  }
}
