// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { UserModule } from '../user/user.module';
import { VendorModule } from '../vendor/vendor.module'; // ✅ Import VendorModule
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [
    ProductsModule,
    OrdersModule,
    UserModule,
    VendorModule,
    MonitoringModule
  ],
  controllers: [AdminController],
})
export class AdminModule {}