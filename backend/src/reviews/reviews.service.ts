// src/reviews/reviews.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from './review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: number, dto: CreateReviewDto): Promise<Review> {
    // Check if user already reviewed this product
    const existing = await this.reviewRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: dto.productId },
        isDeleted: false,
      },
    });

    if (existing) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // Check if user purchased this product (verified purchase)
    // This would require checking orders table

    const review = this.reviewRepository.create({
      user: { id: userId },
      product: { id: dto.productId },
      rating: dto.rating,
      title: dto.title || '',
      comment: dto.comment || '',
      images: dto.images,
      isApproved: true, // Auto-approve, or set false for moderation
      metadata: {
        verifiedPurchase: false, // Check order history
        helpfulCount: 0,
        reportedCount: 0,
      },
    });

    const saved = await this.reviewRepository.save(review);

    // Update product rating
    await this.updateProductRating(dto.productId);

    this.logger.log(`Review created for product ${dto.productId} by user ${userId}`);
    return saved;
  }

  async findByProduct(productId: number, page: number = 1, limit: number = 10): Promise<any> {
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: {
        product: { id: productId },
        isApproved: true,
        isDeleted: false,
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const ratingStats = await this.getProductRatingStats(productId);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        ...ratingStats,
      },
    };
  }

  async getProductRatingStats(productId: number): Promise<any> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'totalReviews')
      .addSelect('COUNT(CASE WHEN review.rating = 5 THEN 1 END)', 'rating5')
      .addSelect('COUNT(CASE WHEN review.rating = 4 THEN 1 END)', 'rating4')
      .addSelect('COUNT(CASE WHEN review.rating = 3 THEN 1 END)', 'rating3')
      .addSelect('COUNT(CASE WHEN review.rating = 2 THEN 1 END)', 'rating2')
      .addSelect('COUNT(CASE WHEN review.rating = 1 THEN 1 END)', 'rating1')
      .where('review.productId = :productId', { productId })
      .andWhere('review.isApproved = true')
      .andWhere('review.isDeleted = false')
      .getRawOne();

    return {
      average: parseFloat(result.averageRating || 0),
      total: parseInt(result.totalReviews || 0),
      distribution: {
        5: parseInt(result.rating5 || 0),
        4: parseInt(result.rating4 || 0),
        3: parseInt(result.rating3 || 0),
        2: parseInt(result.rating2 || 0),
        1: parseInt(result.rating1 || 0),
      },
    };
  }

  async updateProductRating(productId: number): Promise<void> {
    const stats = await this.getProductRatingStats(productId);
    // Update product with new rating - using raw query
    await this.dataSource.query(
      `UPDATE products SET 
        "averageRating" = $1, 
        "totalReviews" = $2 
      WHERE id = $3`,
      [stats.average, stats.total, productId]
    );
  }

  async markHelpful(reviewId: number, userId: number): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Prevent marking own review
    if (review.user.id === userId) {
      throw new BadRequestException('Cannot mark your own review as helpful');
    }

    review.metadata = {
      ...review.metadata,
      helpfulCount: (review.metadata?.helpfulCount || 0) + 1,
    };

    await this.reviewRepository.save(review);
  }

  async reportReview(reviewId: number, userId: number): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.metadata = {
      ...review.metadata,
      reportedCount: (review.metadata?.reportedCount || 0) + 1,
    };

    await this.reviewRepository.save(review);
  }

  async adminApprove(reviewId: number): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.isApproved = true;
    review.approvedAt = new Date();
    await this.reviewRepository.save(review);

    await this.updateProductRating(review.product.id);
  }

  async adminDelete(reviewId: number): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.isDeleted = true;
    await this.reviewRepository.save(review);

    await this.updateProductRating(review.product.id);
  }
}