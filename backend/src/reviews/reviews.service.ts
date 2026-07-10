// src/reviews/reviews.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from './review.entity';
import { Product } from '../products/products.entity';
import { Order } from '../orders/order.entity';
import { User, UserRole } from '../user/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // CREATE REVIEW
  // ============================================================
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

    // Check if product exists and is active
    const product = await this.productRepository.findOne({
      where: { id: dto.productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    // Check if user has purchased this product (verified purchase)
    const hasPurchased = await this.hasUserPurchasedProduct(userId, dto.productId);

    const review = this.reviewRepository.create({
      user: { id: userId },
      product: { id: dto.productId },
      rating: dto.rating,
      title: dto.title || '',
      comment: dto.comment || '',
      images: dto.images || [],
      isApproved: true, // Auto-approve; can be set to false for moderation
      metadata: {
        verifiedPurchase: hasPurchased,
        helpfulCount: 0,
        reportedCount: 0,
      },
    });

    const saved = await this.reviewRepository.save(review);

    // Update product rating
    await this.updateProductRating(dto.productId);

    this.logger.log(
      `Review created for product ${dto.productId} by user ${userId} (verified: ${hasPurchased})`,
    );
    return saved;
  }

  // ============================================================
  // FIND BY PRODUCT (with pagination and stats)
  // ============================================================
  async findByProduct(
    productId: number,
    page: number = 1,
    limit: number = 10,
    rating?: number,
  ): Promise<any> {
    const query = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.productId = :productId', { productId })
      .andWhere('review.isApproved = true')
      .andWhere('review.isDeleted = false');

    if (rating) {
      query.andWhere('review.rating = :rating', { rating });
    }

    const [data, total] = await query
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const ratingStats = await this.getProductRatingStats(productId);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        ...ratingStats,
      },
    };
  }

  // ============================================================
  // GET PRODUCT RATING STATS
  // ============================================================
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
      average: parseFloat(result?.averageRating || 0),
      total: parseInt(result?.totalReviews || 0),
      distribution: {
        5: parseInt(result?.rating5 || 0),
        4: parseInt(result?.rating4 || 0),
        3: parseInt(result?.rating3 || 0),
        2: parseInt(result?.rating2 || 0),
        1: parseInt(result?.rating1 || 0),
      },
    };
  }

  // ============================================================
  // UPDATE PRODUCT RATING (called after review changes)
  // ============================================================
  async updateProductRating(productId: number): Promise<void> {
    const stats = await this.getProductRatingStats(productId);
    await this.dataSource.query(
      `UPDATE products SET 
        "averageRating" = $1, 
        "totalReviews" = $2 
      WHERE id = $3`,
      [stats.average, stats.total, productId],
    );
    this.logger.debug(`Updated product ${productId} rating to ${stats.average}`);
  }

  // ============================================================
  // FIND ONE REVIEW
  // ============================================================
  async findOne(id: number): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['user', 'product'],
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  // ============================================================
  // UPDATE REVIEW
  // ============================================================
  async update(
    id: number,
    userId: number,
    dto: UpdateReviewDto,
    userRole: UserRole,
  ): Promise<Review> {
    const review = await this.findOne(id);

    // Check ownership or admin/superadmin
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
    if (!isAdmin && review.user.id !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    // Update fields
    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.title !== undefined) review.title = dto.title;
    if (dto.comment !== undefined) review.comment = dto.comment;
    if (dto.images !== undefined) review.images = dto.images;

    // Admin can approve/reject reviews
    if (isAdmin && dto.isApproved !== undefined) {
      review.isApproved = dto.isApproved;
      review.approvedAt = dto.isApproved ? new Date() : undefined;
    }

    const updated = await this.reviewRepository.save(review);

    // Update product rating
    await this.updateProductRating(review.product.id);

    this.logger.log(`Review ${id} updated by user ${userId}`);
    return updated;
  }

  // ============================================================
  // DELETE REVIEW (soft delete)
  // ============================================================
  async delete(id: number, userId: number, userRole: UserRole): Promise<void> {
    const review = await this.findOne(id);

    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
    if (!isAdmin && review.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    review.isDeleted = true;
    await this.reviewRepository.save(review);

    // Update product rating
    await this.updateProductRating(review.product.id);

    this.logger.log(`Review ${id} deleted by user ${userId}`);
  }

  // ============================================================
  // MARK HELPUL
  // ============================================================
  async markHelpful(reviewId: number, userId: number): Promise<void> {
    const review = await this.findOne(reviewId);

    // Prevent marking own review
    if (review.user.id === userId) {
      throw new BadRequestException('Cannot mark your own review as helpful');
    }

    review.metadata = {
      ...review.metadata,
      helpfulCount: (review.metadata?.helpfulCount || 0) + 1,
    };

    await this.reviewRepository.save(review);
    this.logger.log(`Review ${reviewId} marked helpful by user ${userId}`);
  }

  // ============================================================
  // REPORT REVIEW
  // ============================================================
  async reportReview(reviewId: number, userId: number): Promise<void> {
    const review = await this.findOne(reviewId);

    review.metadata = {
      ...review.metadata,
      reportedCount: (review.metadata?.reportedCount || 0) + 1,
    };

    await this.reviewRepository.save(review);
    this.logger.warn(`Review ${reviewId} reported by user ${userId}`);
  }

  // ============================================================
  // ADMIN: APPROVE REVIEW
  // ============================================================
  async adminApprove(reviewId: number): Promise<void> {
    const review = await this.findOne(reviewId);

    if (review.isApproved) {
      throw new BadRequestException('Review is already approved');
    }

    review.isApproved = true;
    review.approvedAt = new Date();
    await this.reviewRepository.save(review);

    await this.updateProductRating(review.product.id);
    this.logger.log(`Review ${reviewId} approved by admin`);
  }

  // ============================================================
  // ADMIN: REJECT REVIEW
  // ============================================================
  async adminReject(reviewId: number): Promise<void> {
    const review = await this.findOne(reviewId);

    if (review.isApproved === false) {
      throw new BadRequestException('Review is already rejected');
    }

    review.isApproved = false;
    review.approvedAt = undefined;
    await this.reviewRepository.save(review);

    await this.updateProductRating(review.product.id);
    this.logger.log(`Review ${reviewId} rejected by admin`);
  }

  // ============================================================
  // ADMIN: GET ALL REVIEWS (with filters)
  // ============================================================
  async adminGetAll(
    page: number = 1,
    limit: number = 20,
    filters?: { isApproved?: boolean; isDeleted?: boolean; rating?: number },
  ): Promise<{ data: Review[]; meta: any }> {
    const query = this.reviewRepository
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

  // ============================================================
  // GET VENDOR REVIEWS – PRODUCTION-GRADE IMPLEMENTATION
  // ============================================================
  async getVendorReviews(
    vendorId: number,
    page: number = 1,
    limit: number = 20,
    rating?: number,
  ): Promise<{ data: Review[]; meta: any; stats: any }> {
    // Build query to get reviews for all products belonging to this vendor
    const query = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.product', 'product')
      .leftJoinAndSelect('product.owner', 'owner')
      .where('owner.id = :vendorId', { vendorId })
      .andWhere('review.isApproved = true')
      .andWhere('review.isDeleted = false');

    if (rating) {
      query.andWhere('review.rating = :rating', { rating });
    }

    const [data, total] = await query
      .orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Calculate stats for this vendor
    const stats = await this.getVendorReviewStats(vendorId);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  // ============================================================
  // GET VENDOR REVIEW STATS – AGGREGATED
  // ============================================================
  async getVendorReviewStats(vendorId: number): Promise<any> {
    // Get all reviews for vendor's products
    const reviews = await this.reviewRepository
      .createQueryBuilder('review')
      .leftJoin('review.product', 'product')
      .leftJoin('product.owner', 'owner')
      .where('owner.id = :vendorId', { vendorId })
      .andWhere('review.isApproved = true')
      .andWhere('review.isDeleted = false')
      .getMany();

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const r of reviews) {
      distribution[r.rating as keyof typeof distribution]++;
    }

    return {
      averageRating: sum / total,
      totalReviews: total,
      distribution,
    };
  }

  // ============================================================
  // GET USER'S REVIEW FOR A PRODUCT
  // ============================================================
  async getUserReviewForProduct(userId: number, productId: number): Promise<Review | null> {
    return this.reviewRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
        isDeleted: false,
      },
    });
  }

  // ============================================================
  // CHECK IF USER HAS PURCHASED A PRODUCT
  // ============================================================
  private async hasUserPurchasedProduct(userId: number, productId: number): Promise<boolean> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .where('order.userId = :userId', { userId })
      .andWhere('item.productId = :productId', { productId })
      .andWhere('order.status NOT IN (:...statuses)', {
        statuses: ['cancelled', 'pending'],
      })
      .getOne();

    return !!result;
  }

  // ============================================================
  // RECALCULATE ALL PRODUCT RATINGS (for admin)
  // ============================================================
  async recalculateAllProductRatings(): Promise<void> {
    this.logger.log('Recalculating all product ratings...');

    const products = await this.productRepository.find({
      where: { isActive: true },
    });

    for (const product of products) {
      await this.updateProductRating(product.id);
    }

    this.logger.log(`Recalculated ratings for ${products.length} products`);
  }

  // ============================================================
  // GET REVIEW COUNT FOR PRODUCT
  // ============================================================
  async getReviewCount(productId: number): Promise<number> {
    return this.reviewRepository.count({
      where: {
        product: { id: productId },
        isApproved: true,
        isDeleted: false,
      },
    });
  }

  // ============================================================
  // GET AVERAGE RATING FOR PRODUCT
  // ============================================================
  async getAverageRating(productId: number): Promise<number> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .where('review.productId = :productId', { productId })
      .andWhere('review.isApproved = true')
      .andWhere('review.isDeleted = false')
      .getRawOne();

    return parseFloat(result?.average || 0);
  }
}