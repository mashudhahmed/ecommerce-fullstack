// src/superadmin/superadmin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { VendorModule } from '../vendor/vendor.module';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { User } from '../user/user.entity';

@Module({
  imports: [
    AuthModule,
    UserModule,
    VendorModule,
    ProductsModule,
    OrdersModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [SuperadminController],
  providers: [SuperadminService],
  exports: [SuperadminService],
})
export class SuperadminModule {}