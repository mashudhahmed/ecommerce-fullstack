// src/reviews/reviews.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewAnalyticsService } from './review-analytics.service';
import { Product } from '../products/products.entity';
import { Order } from '../orders/order.entity';
import { User } from '../user/user.entity';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Product, Order, User]),
    FilesModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewAnalyticsService],
  exports: [ReviewsService, ReviewAnalyticsService],
})
export class ReviewsModule {}