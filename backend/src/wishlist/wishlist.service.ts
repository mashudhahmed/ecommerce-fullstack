import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistItem } from './wishlist.entity';
import { User } from '../user/user.entity';
import { Product } from '../products/products.entity';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    @InjectRepository(WishlistItem)
    private readonly wishlistRepository: Repository<WishlistItem>,
  ) {}

  async addToWishlist(userId: number, productId: number): Promise<WishlistItem> {
    const existing = await this.wishlistRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });

    if (existing) {
      throw new ConflictException('Product already in wishlist');
    }

    const item = this.wishlistRepository.create({
      user: { id: userId },
      product: { id: productId },
    });

    const saved = await this.wishlistRepository.save(item);
    this.logger.log(`Product ${productId} added to wishlist for user ${userId}`);
    return saved;
  }

  async removeFromWishlist(userId: number, productId: number): Promise<void> {
    const result = await this.wishlistRepository.delete({
      user: { id: userId },
      product: { id: productId },
    });

    if (result.affected === 0) {
      throw new NotFoundException('Item not found in wishlist');
    }

    this.logger.log(`Product ${productId} removed from wishlist for user ${userId}`);
  }

  async getUserWishlist(userId: number, page: number = 1, limit: number = 20): Promise<any> {
    const [items, total] = await this.wishlistRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['product'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: items.map(item => item.product),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    const count = await this.wishlistRepository.count({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });
    return count > 0;
  }

  async getWishlistCount(userId: number): Promise<number> {
    return this.wishlistRepository.count({
      where: { user: { id: userId } },
    });
  }

  async clearWishlist(userId: number): Promise<void> {
    await this.wishlistRepository.delete({
      user: { id: userId },
    });
    this.logger.log(`Wishlist cleared for user ${userId}`);
  }
}