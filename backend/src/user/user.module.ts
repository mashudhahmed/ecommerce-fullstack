import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { SuperAdminSeeder } from './superadmin.seeder';
// Import your existing controllers here

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService, SuperAdminSeeder],
  exports: [UserService, SuperAdminSeeder],
  // Add your existing controllers here
})
export class UserModule {}