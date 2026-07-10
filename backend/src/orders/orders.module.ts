// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Product } from '../products/products.entity';
import { User } from '../user/user.entity';
import { MailerModule } from '../mailer/mailer.module';
import { IdempotencyKey } from './idempotency-key.entity';
import { IdempotencyService } from './idempotency.service';
import { EventsModule } from '../events/events.module';
import { UserRateLimit } from '../common/entities/user-rate-limit.entity';   // ✅ Import the entity
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      User,
      IdempotencyKey,
      UserRateLimit,
      MonitoringModule
    ]),
    MailerModule,
    EventsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    IdempotencyService,
    // UserRateLimitGuard is not a provider – it's used as a guard; the repository is injected via TypeOrmModule
  ],
  exports: [OrdersService, IdempotencyService],
})
export class OrdersModule {}