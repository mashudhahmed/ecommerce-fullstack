// src/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Product } from './products.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UserRole } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { CacheService } from '../common/cache/cache.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  // ============================================================
  // CREATE
  // ============================================================
  async create(createProductDto: CreateProductDto, userId: number): Promise<Product> {
    const user = await this.userService.findByIdOrFail(userId);

    if (user.role === UserRole.USER) {
      throw new ForbiddenException('Only vendors and admins can create products');
    }

    if (user.role === UserRole.VENDOR && !user.isVendorApproved) {
      throw new ForbiddenException('Your vendor account is pending approval');
    }

    const product = this.productRepository.create({
      ...createProductDto,
      owner: user,
    });

    const savedProduct = await this.productRepository.save(product);
    this.logger.log(`Product created: ${savedProduct.title} by user ${userId}`);

    // ✅ Invalidate all product caches
    await this.invalidateProductCaches();

    return savedProduct;
  }

  // ============================================================
  // FIND ALL (non-paginated)
  // ============================================================
  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isActive: true },
      relations: ['owner', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================
  // FIND ALL PAGINATED
  // ============================================================
  async findAllPaginated(page: number = 1, limit: number = 20): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.productRepository.findAndCount({
      where: { isActive: true },
      relations: ['owner', 'category'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================
  // FIND ONE – WITH CACHE BUSTING
  // ============================================================
  async findOne(id: number, bypassCache: boolean = false): Promise<Product> {
    const cacheKey = `product:${id}`;

    // ✅ Skip cache if bypass requested
    if (!bypassCache) {
      const cached = await this.cacheService.get<Product>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for product ${id}`);
        return cached;
      }
    }

    // Cache miss – fetch from database
    const product = await this.productRepository.findOne({
      where: { id, isActive: true },
      relations: ['owner', 'category'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // ✅ Store in cache
    await this.cacheService.set(cacheKey, product, this.CACHE_TTL);
    this.logger.debug(`Product ${id} cached`);

    return product;
  }

  // ============================================================
  // FIND ONE WITH CACHE BYPASS (for frontend refresh)
  // ============================================================
  async findOneFresh(id: number): Promise<Product> {
    // ✅ Delete cache first, then fetch fresh
    await this.cacheService.del(`product:${id}`);
    return this.findOne(id, true);
  }

  // ============================================================
  // FIND BY IDS (for bulk operations)
  // ============================================================
  async findByIds(ids: number[]): Promise<Product[]> {
    if (!ids || ids.length === 0) return [];
    return this.productRepository.find({
      where: { id: In(ids), isActive: true },
      relations: ['owner', 'category'],
    });
  }

  // ============================================================
  // FIND IN STOCK
  // ============================================================
  async findInStock(): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.owner', 'owner')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.stock > 0')
      .andWhere('product.isActive = true')
      .orderBy('product.createdAt', 'DESC')
      .getMany();
  }

  // ============================================================
  // FIND OUT OF STOCK
  // ============================================================
  async findOutOfStock(): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.owner', 'owner')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.stock = 0')
      .andWhere('product.isActive = true')
      .orderBy('product.createdAt', 'DESC')
      .getMany();
  }

  // ============================================================
  // FIND LOW STOCK
  // ============================================================
  async findLowStock(threshold: number = 10): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.owner', 'owner')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.stock < :threshold', { threshold })
      .andWhere('product.stock > 0')
      .andWhere('product.isActive = true')
      .orderBy('product.stock', 'ASC')
      .getMany();
  }

  // ============================================================
  // FIND BY VENDOR
  // ============================================================
  async findByVendor(vendorId: number): Promise<Product[]> {
    return this.productRepository.find({
      where: {
        owner: { id: vendorId },
        isActive: true,
      },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================
  // UPDATE – with cache invalidation
  // ============================================================
  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      if (!product.owner || product.owner.id !== userId) {
        throw new ForbiddenException('You can only update your own products');
      }
    }

    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productRepository.save(product);
    this.logger.log(`Product updated: ${updatedProduct.title} by user ${userId}`);

    // ✅ Invalidate caches
    await this.invalidateProductCaches(id);

    return updatedProduct;
  }

  // ============================================================
  // DELETE (Soft)
  // ============================================================
  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    const product = await this.findOne(id);

    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      if (!product.owner || product.owner.id !== userId) {
        throw new ForbiddenException('You can only delete your own products');
      }
    }

    product.isActive = false;
    await this.productRepository.save(product);
    this.logger.log(`Product deleted: ${product.title} by user ${userId}`);

    // ✅ Invalidate caches
    await this.invalidateProductCaches(id);
  }

  // ============================================================
  // PERMANENT DELETE
  // ============================================================
  async permanentlyDelete(id: number, userRole: UserRole): Promise<void> {
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      throw new ForbiddenException('Only admins can permanently delete products');
    }

    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.remove(product);
    this.logger.log(`Product permanently deleted: ${product.title}`);

    // ✅ Invalidate caches
    await this.invalidateProductCaches(id);
  }

  // ============================================================
  // STOCK MANAGEMENT
  // ============================================================
  async checkStock(productId: number, quantity: number): Promise<boolean> {
    const product = await this.findOne(productId);
    return product.isInStock(quantity);
  }

  async reduceStock(productId: number, quantity: number): Promise<void> {
    const product = await this.findOne(productId);
    product.reduceStock(quantity);
    await this.productRepository.save(product);
    await this.cacheService.del(`product:${productId}`);
  }

  async increaseStock(productId: number, quantity: number): Promise<void> {
    const product = await this.findOne(productId);
    product.stock += quantity;
    await this.productRepository.save(product);
    await this.cacheService.del(`product:${productId}`);
  }

  // ============================================================
  // BULK STOCK UPDATE
  // ============================================================
  async bulkUpdateStock(
    vendorId: number,
    updates: { productId: number; stock: number }[],
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productIds = updates.map((u) => u.productId);
      const products = await queryRunner.manager.find(Product, {
        where: { id: In(productIds), owner: { id: vendorId } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const update of updates) {
        const product = productMap.get(update.productId);
        if (!product) {
          throw new NotFoundException(`Product with ID ${update.productId} not found or not yours`);
        }

        if (update.stock < 0) {
          throw new BadRequestException(`Stock cannot be negative for product ${product.title}`);
        }

        product.stock = update.stock;
        await queryRunner.manager.save(product);
        await this.cacheService.del(`product:${update.productId}`);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Bulk stock update completed for vendor ${vendorId}`);
      await this.cacheService.invalidatePattern('products:list:*');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // GET VENDOR PRODUCT STATS
  // ============================================================
  async getVendorStats(vendorId: number): Promise<{
    totalProducts: number;
    totalStock: number;
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    const products = await this.productRepository.find({
      where: { owner: { id: vendorId } },
    });

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;

    return {
      totalProducts,
      totalStock,
      lowStockCount,
      outOfStockCount,
    };
  }

  // ============================================================
  // SEARCH PRODUCTS
  // ============================================================
  async searchProducts(query: string, limit: number = 20): Promise<Product[]> {
    if (!query || query.length < 2) return [];

    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.owner', 'owner')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = true')
      .andWhere(
        '(product.title ILIKE :query OR product.description ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('product.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  // ============================================================
  // GET PRODUCTS BY CATEGORY
  // ============================================================
  async findByCategory(categoryId: number): Promise<Product[]> {
    return this.productRepository.find({
      where: { category: { id: categoryId }, isActive: true },
      relations: ['owner', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================
  // CACHE INVALIDATION
  // ============================================================
  private async invalidateProductCaches(productId?: number): Promise<void> {
    if (productId) {
      await this.cacheService.del(`product:${productId}`);
    }
    await this.cacheService.invalidatePattern('products:list:*');
    await this.cacheService.invalidatePattern('products:search:*');
    this.logger.debug(`Invalidated product caches${productId ? ` for product ${productId}` : ''}`);
  }

  // ============================================================
  // WARM CACHE (call on startup)
  // ============================================================
  async warmCache(): Promise<void> {
    this.logger.log('🌡️ Warming product cache...');
    const products = await this.findAll();
    for (const product of products) {
      await this.cacheService.set(`product:${product.id}`, product, this.CACHE_TTL);
    }
    this.logger.log(`✅ Warmed cache for ${products.length} products`);
  }
}