import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { MailerModule } from "src/mailer/mailer.module";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "./order.entity";
import { OrderItem } from "./order-item.entity";
import { Product } from "src/products/products.entity";
import { User } from "src/user/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, User]),
    MailerModule,
    AuthModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService]
})
export class OrdersModule {}
