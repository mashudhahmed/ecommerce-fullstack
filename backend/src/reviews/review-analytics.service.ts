// src/reviews/review-analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';

@Injectable()
export class ReviewAnalyticsService {
  private readonly logger = new Logger(ReviewAnalyticsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async getProductReviewAnalytics(productId: number): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
    sentimentScore: number;
    recentTrend: { date: string; rating: number }[];
  }> {
    // ✅ Fix: Use proper relation syntax
    const reviews = await this.reviewRepo.find({
      where: { 
        product: { id: productId },
        isApproved: true, 
        isDeleted: false 
      },
      order: { createdAt: 'ASC' },
    });

    // Calculate distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    for (const review of reviews) {
      distribution[review.rating as keyof typeof distribution]++;
      totalRating += review.rating;
    }

    // Calculate recent trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentReviews = reviews.filter(r => r.createdAt >= thirtyDaysAgo);
    const dailyTrend = this.groupByDay(recentReviews);

    return {
      averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
      totalReviews: reviews.length,
      ratingDistribution: distribution,
      sentimentScore: this.calculateSentiment(reviews),
      recentTrend: dailyTrend,
    };
  }

  // ✅ Alternative: Using QueryBuilder for complex queries
  async getProductReviewStats(productId: number): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  }> {
    const result = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'totalReviews')
      .addSelect('COUNT(CASE WHEN review.rating = 5 THEN 1 END)', 'rating5')
      .addSelect('COUNT(CASE WHEN review.rating = 4 THEN 1 END)', 'rating4')
      .addSelect('COUNT(CASE WHEN review.rating = 3 THEN 1 END)', 'rating3')
      .addSelect('COUNT(CASE WHEN review.rating = 2 THEN 1 END)', 'rating2')
      .addSelect('COUNT(CASE WHEN review.rating = 1 THEN 1 END)', 'rating1')
      .where('review.productId = :productId', { productId })
      .andWhere('review.isApproved = :isApproved', { isApproved: true })
      .andWhere('review.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    return {
      averageRating: parseFloat(result?.averageRating || 0),
      totalReviews: parseInt(result?.totalReviews || 0),
      ratingDistribution: {
        5: parseInt(result?.rating5 || 0),
        4: parseInt(result?.rating4 || 0),
        3: parseInt(result?.rating3 || 0),
        2: parseInt(result?.rating2 || 0),
        1: parseInt(result?.rating1 || 0),
      },
    };
  }

  // ✅ Get reviews with pagination
  async getProductReviews(
    productId: number,
    page: number = 1,
    limit: number = 10,
    rating?: number,
  ): Promise<{ data: Review[]; meta: any }> {
    const query = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.productId = :productId', { productId })
      .andWhere('review.isApproved = :isApproved', { isApproved: true })
      .andWhere('review.isDeleted = :isDeleted', { isDeleted: false });

    if (rating) {
      query.andWhere('review.rating = :rating', { rating });
    }

    const [data, total] = await query
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ✅ Get all product reviews (for admin)
  async getAllReviews(
    page: number = 1,
    limit: number = 20,
    filters?: { isApproved?: boolean; isDeleted?: boolean; rating?: number },
  ): Promise<{ data: Review[]; meta: any }> {
    const query = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.product', 'product');

    if (filters?.isApproved !== undefined) {
      query.andWhere('review.isApproved = :isApproved', { isApproved: filters.isApproved });
    }
    if (filters?.isDeleted !== undefined) {
      query.andWhere('review.isDeleted = :isDeleted', { isDeleted: filters.isDeleted });
    }
    if (filters?.rating) {
      query.andWhere('review.rating = :rating', { rating: filters.rating });
    }

    const [data, total] = await query
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private groupByDay(reviews: Review[]): { date: string; rating: number }[] {
    const grouped: Record<string, { sum: number; count: number }> = {};

    for (const review of reviews) {
      const date = review.createdAt.toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { sum: 0, count: 0 };
      }
      grouped[date].sum += review.rating;
      grouped[date].count++;
    }

    return Object.entries(grouped).map(([date, data]) => ({
      date,
      rating: data.sum / data.count,
    }));
  }

  private calculateSentiment(reviews: Review[]): number {
    if (reviews.length === 0) return 0;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    // Normalize to -1 to 1 (1 = very positive, -1 = very negative)
    return (avgRating - 3) / 2;
  }

  // ✅ Get overall rating statistics for a product
  async getRatingStats(productId: number): Promise<{
    averageRating: number;
    totalReviews: number;
    distribution: Record<number, number>;
    percentageDistribution: Record<number, number>;
  }> {
    const stats = await this.getProductReviewStats(productId);
    const total = stats.totalReviews || 0;

    const percentageDistribution: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      percentageDistribution[i] = total > 0 ? (stats.ratingDistribution[i] / total) * 100 : 0;
    }

    return {
      averageRating: stats.averageRating,
      totalReviews: stats.totalReviews,
      distribution: stats.ratingDistribution,
      percentageDistribution,
    };
  }

  // ✅ Get review analytics for a vendor
  async getVendorReviewAnalytics(vendorId: number): Promise<{
    totalReviews: number;
    averageRating: number;
    productStats: { productId: number; productName: string; averageRating: number; totalReviews: number }[];
    recentReviews: Review[];
    ratingTrend: { date: string; averageRating: number; count: number }[];
  }> {
    // Get all reviews for vendor's products
    const reviews = await this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.product', 'product')
      .leftJoinAndSelect('product.owner', 'owner')
      .leftJoinAndSelect('review.user', 'user')
      .where('owner.id = :vendorId', { vendorId })
      .andWhere('review.isApproved = :isApproved', { isApproved: true })
      .andWhere('review.isDeleted = :isDeleted', { isDeleted: false })
      .getMany();

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        productStats: [],
        recentReviews: [],
        ratingTrend: [],
      };
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Group by product
    const productMap = new Map<number, { sum: number; count: number; name: string }>();
    for (const review of reviews) {
      const productId = review.product.id;
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          sum: 0,
          count: 0,
          name: review.product.title,
        });
      }
      const data = productMap.get(productId)!;
      data.sum += review.rating;
      data.count++;
    }

    const productStats = Array.from(productMap.entries()).map(([productId, data]) => ({
      productId,
      productName: data.name,
      averageRating: data.sum / data.count,
      totalReviews: data.count,
    }));

    // Get recent reviews (last 10)
    const recentReviews = reviews
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    // Calculate rating trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentReviewsForTrend = reviews.filter(r => r.createdAt >= thirtyDaysAgo);
    const ratingTrend = this.groupByDayForTrend(recentReviewsForTrend);

    return {
      totalReviews: reviews.length,
      averageRating,
      productStats,
      recentReviews,
      ratingTrend,
    };
  }

  private groupByDayForTrend(reviews: Review[]): { date: string; averageRating: number; count: number }[] {
    const grouped: Record<string, { sum: number; count: number }> = {};

    for (const review of reviews) {
      const date = review.createdAt.toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { sum: 0, count: 0 };
      }
      grouped[date].sum += review.rating;
      grouped[date].count++;
    }

    return Object.entries(grouped).map(([date, data]) => ({
      date,
      averageRating: data.sum / data.count,
      count: data.count,
    }));
  }
}