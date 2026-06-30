import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { SuperAdminSeeder } from './superadmin.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService, SuperAdminSeeder],
  exports: [UserService, SuperAdminSeeder],
})
export class UserModule {}