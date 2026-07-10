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
    // Only seed in non-production environments
    if (process.env.NODE_ENV === 'production') {
      this.logger.log('Skipping sample data seeding in production');
      return;
    }

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
      // 1. Create a sample vendor user (if not exists)
      let vendor = await this.userRepo.findOne({
        where: { email: 'sample-vendor@example.com' },
      });
      if (!vendor) {
        const hashedPassword = await bcrypt.hash('Vendor123!', 12);
        vendor = this.userRepo.create({
          name: 'Sample Vendor',
          email: 'sample-vendor@example.com',
          password: hashedPassword,
          role: UserRole.VENDOR,
          isVerified: true,
          isVendorApproved: true,
          vendorBusinessName: 'Sample Store',
          vendorBusinessDescription: 'A sample store for demo purposes',
          vendorPhoneNumber: '+1234567890',
          vendorAddress: '123 Demo St, Sample City',
        });
        vendor = await this.userRepo.save(vendor);
        this.logger.log('✅ Sample vendor created');
      }

      // 2. Create categories
      const categories = [
        { name: 'Electronics', description: 'Devices and gadgets' },
        { name: 'Clothing', description: 'Fashion and apparel' },
        { name: 'Books', description: 'Books and literature' },
        { name: 'Home & Garden', description: 'Home improvement and gardening' },
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
      const productsData = [
        { title: 'Smartphone X', price: 699.99, stock: 50, category: 'Electronics' },
        { title: 'Wireless Headphones', price: 99.99, stock: 120, category: 'Electronics' },
        { title: 'Smartwatch Pro', price: 249.99, stock: 30, category: 'Electronics' },
        { title: 'Bluetooth Speaker', price: 59.99, stock: 80, category: 'Electronics' },
        { title: 'Laptop Stand', price: 29.99, stock: 200, category: 'Electronics' },
        { title: 'T-Shirt (Cotton)', price: 19.99, stock: 150, category: 'Clothing' },
        { title: 'Jeans (Slim Fit)', price: 49.99, stock: 100, category: 'Clothing' },
        { title: 'Jacket (Waterproof)', price: 89.99, stock: 45, category: 'Clothing' },
        { title: 'Sneakers (Running)', price: 79.99, stock: 60, category: 'Clothing' },
        { title: 'Sunglasses', price: 39.99, stock: 90, category: 'Clothing' },
        { title: 'Fiction Novel', price: 14.99, stock: 200, category: 'Books' },
        { title: 'Cookbook', price: 24.99, stock: 75, category: 'Books' },
        { title: 'Science Textbook', price: 59.99, stock: 40, category: 'Books' },
        { title: 'Children\'s Picture Book', price: 9.99, stock: 150, category: 'Books' },
        { title: 'Gardening Tools Set', price: 39.99, stock: 35, category: 'Home & Garden' },
        { title: 'Plant Pots (Set of 3)', price: 19.99, stock: 80, category: 'Home & Garden' },
        { title: 'Outdoor String Lights', price: 29.99, stock: 60, category: 'Home & Garden' },
        { title: 'Board Game', price: 34.99, stock: 50, category: 'Toys & Games' },
        { title: 'Puzzle (1000 pieces)', price: 14.99, stock: 100, category: 'Toys & Games' },
        { title: 'Action Figure', price: 24.99, stock: 70, category: 'Toys & Games' },
      ];

      const productsToInsert = productsData.map((p) => {
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
          imageUrl: `https://picsum.photos/seed/${p.title.replace(/\s/g, '')}/400/400`,
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