import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SuperAdminSeeder } from '../user/superadmin.seeder';
import { User, UserRole } from '../user/user.entity';
import { VendorWallet } from '../vendor/vendor-wallet.entity';

@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    private readonly superAdminSeeder: SuperAdminSeeder,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(VendorWallet)
    private readonly walletRepo: Repository<VendorWallet>,
  ) {}

  async runSeeders() {
    this.logger.log('🌱 Starting database seeding...');
    try {
      await this.superAdminSeeder.seed();
      await this.seedRoleAccounts();
      this.logger.log('✅ Database seeding completed successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.stack : String(error);
      this.logger.error('❌ Database seeding failed', errorMessage);
    }
  }

  private async seedRoleAccounts() {
    this.logger.log('🌱 Checking & seeding role test accounts...');

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
        vendorBusinessDescription:
          'Premier authorized merchant for smartphones, computing hardware, and accessories.',
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

    for (const acc of testAccounts) {
      try {
        let user = await this.userRepo.findOne({ where: { email: acc.email } });
        if (!user) {
          user = this.userRepo.create(acc);
          user = await this.userRepo.save(user);
          this.logger.log(
            `🎉 [SEEDED] ${acc.role.toUpperCase()}: ${acc.email} / ${defaultPassword}`,
          );
        } else {
          let needsSave = false;
          // Ensure password matches Password@123
          const isPassValid = await bcrypt.compare(
            defaultPassword,
            user.password,
          );
          if (!isPassValid) {
            user.password = hashedPassword;
            needsSave = true;
          }
          if (!user.isVerified) {
            user.isVerified = true;
            needsSave = true;
          }
          if (user.role !== acc.role) {
            user.role = acc.role;
            needsSave = true;
          }
          if (acc.role === UserRole.VENDOR) {
            if (!user.isVendorApproved) {
              user.isVendorApproved = true;
              needsSave = true;
            }
            if (user.isVendorRejected) {
              user.isVendorRejected = false;
              needsSave = true;
            }
            if (!user.vendorBusinessName) {
              user.vendorBusinessName = acc.vendorBusinessName;
              needsSave = true;
            }
            if (!user.vendorPhoneNumber) {
              user.vendorPhoneNumber = acc.vendorPhoneNumber;
              needsSave = true;
            }
            if (!user.vendorAddress) {
              user.vendorAddress = acc.vendorAddress;
              needsSave = true;
            }
            if (!user.vendorBusinessRegistration) {
              user.vendorBusinessRegistration =
                acc.vendorBusinessRegistration;
              needsSave = true;
            }
          }
          if (needsSave) {
            await this.userRepo.save(user);
            this.logger.log(`✨ [UPDATED] ${acc.role.toUpperCase()}: ${acc.email}`);
          }
        }

        // Initialize VendorWallet for vendor
        if (acc.role === UserRole.VENDOR && user) {
          let wallet = await this.walletRepo.findOne({
            where: { vendorId: user.id },
          });
          if (!wallet) {
            wallet = this.walletRepo.create({
              vendorId: user.id,
              availableBalance: 1250.0,
              escrowBalance: 320.0,
              totalEarned: 1570.0,
              totalWithdrawn: 0.0,
            });
            await this.walletRepo.save(wallet);
            this.logger.log(
              `💰 Initialized VendorWallet for ${user.email}: $1,250.00 Available / $320.00 Escrow`,
            );
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed seeding account ${acc.email}: ${err?.message}`);
      }
    }
  }
}
