import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [AuthModule, UserModule],
  controllers: [SuperadminController],
})
export class SuperadminModule {}