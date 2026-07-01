import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SuperAdminSeeder } from '../user/superadmin.seeder';

@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(private readonly superAdminSeeder: SuperAdminSeeder) {}

  async runSeeders() {
    this.logger.log('🌱 Starting database seeding...');
    try {
      await this.superAdminSeeder.seed();
      this.logger.log('✅ Database seeding completed successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error('❌ Database seeding failed', errorMessage);
      throw error;
    }
  }
}