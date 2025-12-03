import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SuperadminController]
})
export class SuperadminModule {}
