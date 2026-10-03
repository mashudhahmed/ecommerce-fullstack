import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Return } from './return.entity';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { Order } from '../orders/order.entity';
import { VendorOrder } from '../orders/vendor-order.entity';
import { VendorWallet } from '../vendor/vendor-wallet.entity';
import { Product } from '../products/products.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Return,
      Order,
      VendorOrder,
      VendorWallet,
      Product,
    ]),
    NotificationsModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
