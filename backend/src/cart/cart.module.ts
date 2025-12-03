import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from './cart.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Product } from 'src/products/products.entity';
import { User } from 'src/user/user.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartItem, Product, User]),
    AuthModule, 
  ],
  providers: [CartService],
  controllers: [CartController]
})
export class CartModule {}
