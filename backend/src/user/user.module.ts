import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { SuperAdminSeeder } from './superadmin.seeder';
import { UserController } from './user.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), FilesModule],
  controllers: [UserController],
  providers: [UserService, SuperAdminSeeder],
  exports: [UserService, SuperAdminSeeder],
})
export class UserModule {}
