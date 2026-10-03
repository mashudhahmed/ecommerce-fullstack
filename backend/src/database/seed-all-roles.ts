import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User, UserRole } from '../user/user.entity';
import { Category } from '../categories/category.entity';
import { Product } from '../products/products.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { VendorOrder } from '../orders/vendor-order.entity';
import { OrderTimeline } from '../orders/order-timeline.entity';
import { Return } from '../returns/return.entity';
import { VendorWallet } from '../vendor/vendor-wallet.entity';
import { VendorPayout } from '../vendor/vendor-payout.entity';
import { ChatMessage } from '../chat/chat-message.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '22478112',
  database: process.env.DATABASE_NAME || 'ecommerce_db',
  entities: ['src/**/*.entity.ts'],
  synchronize: false,
});

async function seedRoleUsers() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const walletRepo = AppDataSource.getRepository(VendorWallet);

  const defaultPassword = 'Password@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

  const testAccounts = [
    {
      role: UserRole.SUPER_ADMIN,
      name: 'Global Super Admin',
      email: 'superadmin@marketplace.com',
      password: hashedPassword,
      isVerified: true,
      isVendorApproved: false,
      isVendorRejected: false,
    },
    {
      role: UserRole.ADMIN,
      name: 'Operations Manager',
      email: 'admin@marketplace.com',
      password: hashedPassword,
      isVerified: true,
      isVendorApproved: false,
      isVendorRejected: false,
    },
    {
      role: UserRole.VENDOR,
      name: 'ElectroTech Verified Store',
      email: 'vendor@marketplace.com',
      password: hashedPassword,
      isVerified: true,
      isVendorApproved: true,
      isVendorRejected: false,
      vendorBusinessName: 'ElectroTech Solutions',
      vendorBusinessDescription: 'Premier authorized merchant for smartphones, computing hardware, and accessories.',
      vendorPhoneNumber: '+1 (555) 019-8234',
      vendorAddress: '450 Innovation Way, Tech District, CA',
      vendorBusinessRegistration: 'EIN-US-8927182',
    },
    {
      role: UserRole.USER,
      name: 'Alex Johnson (Customer)',
      email: 'customer@marketplace.com',
      password: hashedPassword,
      isVerified: true,
      isVendorApproved: false,
      isVendorRejected: false,
    },
  ];

  console.log('\n======================================================');
  console.log('  SEEDING VERIFIED ROLE ACCOUNTS');
  console.log('======================================================');

  for (const acc of testAccounts) {
    let existing = await userRepo.findOne({ where: { email: acc.email } });
    if (existing) {
      existing.password = hashedPassword;
      existing.role = acc.role;
      existing.isVerified = acc.isVerified;
      existing.isVendorApproved = acc.isVendorApproved;
      existing.isVendorRejected = acc.isVendorRejected;
      if (acc.vendorBusinessName) existing.vendorBusinessName = acc.vendorBusinessName;
      if (acc.vendorBusinessDescription) existing.vendorBusinessDescription = acc.vendorBusinessDescription;
      if (acc.vendorPhoneNumber) existing.vendorPhoneNumber = acc.vendorPhoneNumber;
      if (acc.vendorAddress) existing.vendorAddress = acc.vendorAddress;
      if (acc.vendorBusinessRegistration) existing.vendorBusinessRegistration = acc.vendorBusinessRegistration;
      await userRepo.save(existing);
      console.log(`[UPDATED] ${acc.role.toUpperCase()}: ${acc.email}`);
    } else {
      const created = userRepo.create(acc);
      existing = await userRepo.save(created);
      console.log(`[CREATED] ${acc.role.toUpperCase()}: ${acc.email}`);
    }

    // If vendor, ensure VendorWallet exists
    if (acc.role === UserRole.VENDOR && existing) {
      let wallet = await walletRepo.findOne({ where: { vendorId: existing.id } });
      if (!wallet) {
        wallet = walletRepo.create({
          vendorId: existing.id,
          availableBalance: 1250.0,
          escrowBalance: 320.0,
          totalEarned: 1570.0,
          totalWithdrawn: 0.0,
        });
        await walletRepo.save(wallet);
        console.log(`  -> Initialized VendorWallet with $1250.00 available balance`);
      }
    }
  }

  console.log('\nAll role accounts ready!\n');
  await AppDataSource.destroy();
}

seedRoleUsers().catch((err) => {
  console.error('Error seeding users:', err);
  process.exit(1);
});
