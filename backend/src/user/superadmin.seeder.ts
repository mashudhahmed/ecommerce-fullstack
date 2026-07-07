import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SuperAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  async seed() {
    try {
      const email = this.configService.get<string>('superAdmin.email');
      const password = this.configService.get<string>('superAdmin.password');

      if (!email || !password) {
        this.logger.warn('⚠️  SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD not set in .env');
        this.logger.warn('⚠️  Skipping SuperAdmin seeding');
        return null;
      }

      // Check if superadmin already exists
      const existingSuperAdmin = await this.userRepository.findOne({
        where: { role: UserRole.SUPER_ADMIN },
      });

      if (existingSuperAdmin) {
        this.logger.log('✅ SuperAdmin already exists');
        return existingSuperAdmin;
      }

      // Check if email already exists
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        this.logger.log(`✅ User with email ${email} already exists`);
        return existingUser;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const superAdmin = this.userRepository.create({
        name: 'Super Administrator',
        email,
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        isVerified: true,
        isVendorApproved: false,
      });

      const savedAdmin = await this.userRepository.save(superAdmin);

      this.logger.log('🎉 SuperAdmin seeded successfully!');
      this.logger.log(`📧 Email: ${savedAdmin.email}`);
      this.logger.log(`🔑 Password: ${password}`);
      this.logger.log('⚠️  Please change the default password immediately!');

      return savedAdmin;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505') {
        this.logger.log('✅ SuperAdmin already exists (duplicate email)');
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to seed SuperAdmin', errorMessage);
      throw error;
    }
  }
}