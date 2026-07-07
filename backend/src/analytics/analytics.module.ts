// src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { Order } from '../orders/order.entity';
import { User } from '../user/user.entity';
import { Product } from '../products/products.entity';
import { OrderItem } from '../orders/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, User, Product])],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}