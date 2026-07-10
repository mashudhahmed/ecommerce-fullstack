// src/reviews/reviews.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ReviewAnalyticsService } from './review-analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly reviewAnalyticsService: ReviewAnalyticsService,
  ) {}

  // ============================================================
  // PUBLIC ENDPOINTS
  // ============================================================

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get product reviews' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getProductReviews(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('rating') rating?: number,
  ) {
    return this.reviewsService.findByProduct(productId, page, limit, rating);
  }

  @Get('product/:productId/stats')
  @ApiOperation({ summary: 'Get product review stats' })
  @ApiResponse({ status: 200, description: 'Review stats retrieved' })
  async getProductReviewStats(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewAnalyticsService.getProductReviewStats(productId);
  }

  // ============================================================
  // AUTHENTICATED ENDPOINTS
  // ============================================================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async createReview(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({ status: 200, description: 'Review updated' })
  async updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
    @Body() dto: any,
  ) {
    return this.reviewsService.update(id, req.user.id, dto, 'user' as any);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  async deleteReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    await this.reviewsService.delete(id, req.user.id, 'user' as any);
    return { message: 'Review deleted' };
  }

  @Post(':id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark review as helpful' })
  @ApiResponse({ status: 200, description: 'Marked as helpful' })
  async markHelpful(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    await this.reviewsService.markHelpful(id, req.user.id);
    return { message: 'Marked as helpful' };
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a review' })
  @ApiResponse({ status: 200, description: 'Review reported' })
  async reportReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    await this.reviewsService.reportReview(id, req.user.id);
    return { message: 'Review reported' };
  }
}