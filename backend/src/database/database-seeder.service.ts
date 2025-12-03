import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { SuperAdminSeeder } from '../user/superadmin.seeder';

@Injectable()
export class DatabaseSeederService implements OnApplicationBootstrap {
  constructor(private readonly superAdminSeeder: SuperAdminSeeder) {}

  async onApplicationBootstrap() {
    await this.runSeeders();
  }

  private async runSeeders() {
    await this.superAdminSeeder.seed();
    // You can add more seeders here later
    // await this.productSeeder.seed();
    // await this.categorySeeder.seed();
  }
}