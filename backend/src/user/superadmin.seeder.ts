import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class SuperAdminSeeder {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed() {
    try {
      const superAdminExists = await this.userRepository.findOne({
        where: { role: 'superadmin' }
      });

      if (superAdminExists) {
        this.logger.log('✅ SuperAdmin already exists');
        return superAdminExists;
      }

      const hashedPassword = await bcrypt.hash('superadmin123', 12);

      const superAdmin = this.userRepository.create({
        name: 'Super Administrator',
        email: 'superadmin@yourapp.com',
        password: hashedPassword,
        role: 'superadmin',
        isVerified: true,
      });

      const savedAdmin = await this.userRepository.save(superAdmin);
      
      this.logger.log('🎉 SuperAdmin seeded successfully!');
      this.logger.log(`📧 Email: ${savedAdmin.email}`);
      this.logger.log(`🔑 Password: superadmin123`);
      this.logger.log('⚠️  Please change the default password immediately!');

      return savedAdmin;
    } catch (error) {
      this.logger.error('❌ Failed to seed SuperAdmin', error.message);
      throw error;
    }
  }
}