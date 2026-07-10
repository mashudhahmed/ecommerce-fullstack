// src/wishlist/wishlist.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistItem } from './wishlist.entity';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { Product } from '../products/products.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WishlistItem, Product, User])],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}