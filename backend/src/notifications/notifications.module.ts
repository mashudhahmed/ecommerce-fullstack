// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';
import { User } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { MailerModule } from '../mailer/mailer.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    UserModule,
    MailerModule,
    MonitoringModule
  ],
  controllers: [NotificationsController],  // ✅ Controller registered here
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}