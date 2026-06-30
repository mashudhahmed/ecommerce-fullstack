import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SuperAdminSeeder {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async seed() {
    try {
      // Check if superadmin already exists
      const superAdminExists = await this.userRepository.findOne({
        where: { role: 'superadmin' },
      });

      if (superAdminExists) {
        this.logger.log('✅ SuperAdmin already exists');
        return superAdminExists;
      }

      const email = this.configService.get<string>('superAdmin.email');
      const password = this.configService.get<string>('superAdmin.password');

      if (!email || !password) {
        this.logger.warn('⚠️  SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD not set in .env');
        this.logger.warn('⚠️  Skipping SuperAdmin seeding');
        return null;
      }

      // Check if email already exists (in case of duplicate)
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
        role: 'superadmin',
        isVerified: true,
      });

      const savedAdmin = await this.userRepository.save(superAdmin);

      this.logger.log('🎉 SuperAdmin seeded successfully!');
      this.logger.log(`📧 Email: ${savedAdmin.email}`);
      this.logger.log(`🔑 Password: ${password}`);
      this.logger.log('⚠️  Please change the default password immediately!');

      return savedAdmin;
    } catch (error) {
      // Check if it's a duplicate key error (23505)
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === '23505'
      ) {
        this.logger.log('✅ SuperAdmin already exists (duplicate email)');
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to seed SuperAdmin', errorMessage);
      throw error;
    }
  }
}