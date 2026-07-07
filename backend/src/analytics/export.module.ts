// src/analytics/export.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { UserModule } from '../user/user.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { Order } from '../orders/order.entity';
import { User } from '../user/user.entity';
import { Product } from '../products/products.entity';

@Module({
  imports: [
    UserModule,
    OrdersModule,
    ProductsModule,
    TypeOrmModule.forFeature([Order, User, Product]),
  ],
  providers: [ExportService],
  controllers: [ExportController],
  exports: [ExportService],
})
export class ExportModule {}