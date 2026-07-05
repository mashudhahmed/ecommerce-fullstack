import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [ProductsModule, OrdersModule, UserModule],
  controllers: [AdminController],
})
export class AdminModule {}