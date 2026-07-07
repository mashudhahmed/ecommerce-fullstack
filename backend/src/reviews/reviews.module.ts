// src/reviews/reviews.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewAnalyticsService } from './review-analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Review])],
  providers: [ReviewsService, ReviewAnalyticsService],
  exports: [ReviewsService, ReviewAnalyticsService],
})
export class ReviewsModule {}