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
import { Repository, DataSource, In, MoreThan, LessThan } from 'typeorm';
import { Product } from './products.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UserRole } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { CacheService } from '../common/cache/cache.service';
import { MetricsService } from '../monitoring/metrics.service';
import { Trace } from '../common/decorators/tracing.decorator';
import { QueryTimeout } from '../common/decorators/query-timeout.decorator';
import { BULK_LIMITS } from '../common/constants/bulk-limits';
import { EventsService } from '../events/events.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly CACHE_TTL = 300;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
    private readonly eventsService: EventsService,
  ) {}

  @Trace('products.create')
  @QueryTimeout(10000)
  async create(createProductDto: CreateProductDto, userId: number): Promise<Product> {
    const startTime = Date.now();

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

    this.metricsService.recordProductCreation(userId);
    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('insert', 'products', duration);

    this.eventsService.emitProductCreated({
      productId: savedProduct.id,
      vendorId: userId,
      title: savedProduct.title,
      action: 'created',
    });

    await this.invalidateProductCaches();

    return savedProduct;
  }

  @Trace('products.findAll')
  @QueryTimeout(15000)
  async findAll(): Promise<Product[]> {
    const cacheKey = 'products:all';
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      this.logger.debug('Cache hit for all products');
      this.metricsService.recordCacheHit('products:all');
      return cached;
    }

    this.metricsService.recordCacheMiss('products:all');
    const startTime = Date.now();

    const products = await this.productRepository.find({
      where: { isActive: true },
      relations: ['owner', 'category'],
      order: { createdAt: 'DESC' },
    });

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('find', 'products', duration);

    await this.cacheService.set(cacheKey, products, this.CACHE_TTL);
    return products;
  }

  @Trace('products.findAllPaginated')
  @QueryTimeout(10000)
  async findAllPaginated(page: number = 1, limit: number = 20): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const cacheKey = `products:list:${page}:${limit}`;
    const cached = await this.cacheService.get<{
      data: Product[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(cacheKey);
    
    if (cached && typeof cached === 'object' && 'data' in cached && 'total' in cached) {
      this.metricsService.recordCacheHit('products:list');
      return cached;
    }

    this.metricsService.recordCacheMiss('products:list');
    const startTime = Date.now();

    const skip = (page - 1) * limit;

    const [data, total] = await this.productRepository.findAndCount({
      where: { isActive: true },
      relations: ['owner', 'category'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const result = {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('findAndCount', 'products', duration);

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Trace('products.findOne')
  @QueryTimeout(5000)
  async findOne(id: number, bypassCache: boolean = false): Promise<Product> {
    const cacheKey = `product:${id}`;

    if (!bypassCache) {
      const cached = await this.cacheService.get<Product>(cacheKey);
      if (cached && typeof cached === 'object' && 'id' in cached) {
        this.logger.debug(`Cache hit for product ${id}`);
        this.metricsService.recordCacheHit(`product:${id}`);
        return cached;
      }
      this.metricsService.recordCacheMiss(`product:${id}`);
    }

    const startTime = Date.now();

    const product = await this.productRepository.findOne({
      where: { id, isActive: true },
      relations: ['owner', 'category'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('findOne', 'products', duration);

    await this.cacheService.set(cacheKey, product, this.CACHE_TTL);
    return product;
  }

  @Trace('products.findOneFresh')
  async findOneFresh(id: number): Promise<Product> {
    await this.cacheService.del(`product:${id}`);
    return this.findOne(id, true);
  }

  @Trace('products.findByIds')
  @QueryTimeout(10000)
  async findByIds(ids: number[]): Promise<Product[]> {
    if (!ids || ids.length === 0) return [];

    const cacheKey = `products:ids:${ids.sort().join(',')}`;
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }

    const startTime = Date.now();

    const products = await this.productRepository.find({
      where: { id: In(ids), isActive: true },
      relations: ['owner', 'category'],
    });

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('findByIds', 'products', duration);

    await this.cacheService.set(cacheKey, products, this.CACHE_TTL);
    return products;
  }

  @Trace('products.findInStock')
  @QueryTimeout(10000)
  async findInStock(): Promise<Product[]> {
    const cacheKey = 'products:in-stock';
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const startTime = Date.now();

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.owner', 'owner')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.stock > 0')
      .andWhere('product.isActive = true')
      .orderBy('product.createdAt', 'DESC')
      .getMany();

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('findInStock', 'products', duration);

    await this.cacheService.set(cacheKey, products, this.CACHE_TTL);
    return products;
  }

  @Trace('products.findOutOfStock')
  @QueryTimeout(10000)
  async findOutOfStock(): Promise<Product[]> {
    const cacheKey = 'products:out-of-stock';
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const startTime = Date.now();

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.owner', 'owner')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.stock = 0')
      .andWhere('product.isActive = true')
      .orderBy('product.createdAt', 'DESC')
      .getMany();

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('findOutOfStock', 'products', duration);

    await this.cacheService.set(cacheKey, products, this.CACHE_TTL);
    return products;
  }

  @Trace('products.findLowStock')
  @QueryTimeout(10000)
  async findLowStock(threshold: number = 10): Promise<Product[]> {
    const cacheKey = `products:low-stock:${threshold}`;
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const startTime = Date.now();

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.owner', 'owner')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.stock < :threshold', { threshold })
      .andWhere('product.stock > 0')
      .andWhere('product.isActive = true')
      .orderBy('product.stock', 'ASC')
      .getMany();

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('findLowStock', 'products', duration);

    await this.cacheService.set(cacheKey, products, this.CACHE_TTL);
    return products;
  }

  @Trace('products.findByVendor')
  @QueryTimeout(10000)
  async findByVendor(vendorId: number): Promise<Product[]> {
    const cacheKey = `products:vendor:${vendorId}`;
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const startTime = Date.now();

    const products = await this.productRepository.find({
      where: {
        owner: { id: vendorId },
        isActive: true,
      },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('findByVendor', 'products', duration);

    await this.cacheService.set(cacheKey, products, this.CACHE_TTL);
    return products;
  }

  @Trace('products.update')
  @QueryTimeout(10000)
  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Product> {
    const startTime = Date.now();

    const product = await this.findOne(id);

    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      if (!product.owner || product.owner.id !== userId) {
        throw new ForbiddenException('You can only update your own products');
      }
    }

    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productRepository.save(product);
    this.logger.log(`Product updated: ${updatedProduct.title} by user ${userId}`);

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('update', 'products', duration);

    this.eventsService.emitProductUpdated({
      productId: updatedProduct.id,
      vendorId: userId,
      title: updatedProduct.title,
      action: 'updated',
    });

    await this.invalidateProductCaches(id);

    return updatedProduct;
  }

  @Trace('products.remove')
  @QueryTimeout(10000)
  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    const startTime = Date.now();

    const product = await this.findOne(id);

    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      if (!product.owner || product.owner.id !== userId) {
        throw new ForbiddenException('You can only delete your own products');
      }
    }

    product.isActive = false;
    await this.productRepository.save(product);
    this.logger.log(`Product deleted: ${product.title} by user ${userId}`);

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('softDelete', 'products', duration);

    this.eventsService.emitProductDeleted({
      productId: product.id,
      vendorId: userId,
      title: product.title,
      action: 'deleted',
    });

    await this.invalidateProductCaches(id);
  }

  @Trace('products.permanentlyDelete')
  @QueryTimeout(10000)
  async permanentlyDelete(id: number, userRole: UserRole): Promise<void> {
    if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole)) {
      throw new ForbiddenException('Only admins can permanently delete products');
    }

    const startTime = Date.now();

    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.remove(product);
    this.logger.log(`Product permanently deleted: ${product.title}`);

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('delete', 'products', duration);

    await this.invalidateProductCaches(id);
  }

  @Trace('products.checkStock')
  async checkStock(productId: number, quantity: number): Promise<boolean> {
    const product = await this.findOne(productId);
    return product.isInStock(quantity);
  }

  @Trace('products.reduceStock')
  @QueryTimeout(10000)
  async reduceStock(productId: number, quantity: number): Promise<void> {
    const startTime = Date.now();

    const product = await this.findOne(productId);
    product.reduceStock(quantity);
    await this.productRepository.save(product);
    await this.cacheService.del(`product:${productId}`);

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('update', 'products', duration);
  }

  @Trace('products.increaseStock')
  @QueryTimeout(10000)
  async increaseStock(productId: number, quantity: number): Promise<void> {
    const startTime = Date.now();

    const product = await this.findOne(productId);
    product.stock += quantity;
    await this.productRepository.save(product);
    await this.cacheService.del(`product:${productId}`);

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('update', 'products', duration);
  }

  @Trace('products.bulkUpdateStock')
  @QueryTimeout(30000)
  async bulkUpdateStock(
    vendorId: number,
    updates: { productId: number; stock: number }[],
  ): Promise<void> {
    const MAX_BULK = BULK_LIMITS.PRODUCTS.MAX_BULK_STOCK_UPDATE;

    if (updates.length > MAX_BULK) {
      throw new BadRequestException(
        `Maximum ${MAX_BULK} products can be updated at once. ` +
        `You provided ${updates.length}. Please split into smaller batches.`
      );
    }

    if (updates.length === 0) {
      throw new BadRequestException('No updates provided');
    }

    const startTime = Date.now();

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

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordDbQuery('bulkUpdate', 'products', duration);

      await this.cacheService.invalidatePattern('products:list:*');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  @Trace('products.bulkCreateProducts')
  @QueryTimeout(60000)
  async bulkCreateProducts(products: CreateProductDto[], userId: number): Promise<Product[]> {
    const MAX_BULK = BULK_LIMITS.PRODUCTS.MAX_BULK_UPLOAD;

    if (products.length > MAX_BULK) {
      throw new BadRequestException(
        `Maximum ${MAX_BULK} products can be created at once. ` +
        `You provided ${products.length}. Please split into smaller batches.`
      );
    }

    if (products.length === 0) {
      throw new BadRequestException('No products provided');
    }

    const startTime = Date.now();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userService.findByIdOrFail(userId);

      if (user.role === UserRole.USER) {
        throw new ForbiddenException('Only vendors and admins can create products');
      }

      if (user.role === UserRole.VENDOR && !user.isVendorApproved) {
        throw new ForbiddenException('Your vendor account is pending approval');
      }

      const productEntities = products.map((p) =>
        this.productRepository.create({ ...p, owner: user })
      );

      const saved = await queryRunner.manager.save(Product, productEntities);
      await queryRunner.commitTransaction();

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordDbQuery('bulkInsert', 'products', duration);

      for (const p of saved) {
        this.metricsService.recordProductCreation(userId);
        this.eventsService.emitProductCreated({
          productId: p.id,
          vendorId: userId,
          title: p.title,
          action: 'created',
        });
      }

      this.logger.log(`Bulk created ${saved.length} products for vendor ${userId}`);
      await this.invalidateProductCaches();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  @Trace('products.getVendorStats')
  @QueryTimeout(10000)
  async getVendorStats(vendorId: number): Promise<{
    totalProducts: number;
    totalStock: number;
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    const cacheKey = `vendor:${vendorId}:product:stats`;
    const cached = await this.cacheService.get<{
      totalProducts: number;
      totalStock: number;
      lowStockCount: number;
      outOfStockCount: number;
    }>(cacheKey);
    
    // ✅ FIX: Proper type checking for cache
    if (cached && typeof cached === 'object' && 'totalProducts' in cached) {
      this.metricsService.recordCacheHit('vendor:product:stats');
      return cached;
    }

    this.metricsService.recordCacheMiss('vendor:product:stats');
    const startTime = Date.now();

    const products = await this.productRepository.find({
      where: { owner: { id: vendorId } },
    });

    const result = {
      totalProducts: products.length,
      totalStock: products.reduce((sum, p) => sum + p.stock, 0),
      lowStockCount: products.filter((p) => p.stock > 0 && p.stock <= 10).length,
      outOfStockCount: products.filter((p) => p.stock === 0).length,
    };

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('find', 'products', duration);

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  @Trace('products.searchProducts')
  @QueryTimeout(10000)
  async searchProducts(query: string, limit: number = 20): Promise<Product[]> {
    if (!query || query.length < 2) return [];

    const cacheKey = `search:${query}:${limit}`;
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      this.metricsService.recordCacheHit('search');
      return cached;
    }

    this.metricsService.recordCacheMiss('search');
    const startTime = Date.now();

    const results = await this.productRepository
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

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('search', 'products', duration);

    await this.cacheService.set(cacheKey, results, 300);
    return results;
  }

  @Trace('products.findByCategory')
  @QueryTimeout(10000)
  async findByCategory(categoryId: number): Promise<Product[]> {
    const cacheKey = `products:category:${categoryId}`;
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const startTime = Date.now();

    const products = await this.productRepository.find({
      where: { category: { id: categoryId }, isActive: true },
      relations: ['owner', 'category'],
      order: { createdAt: 'DESC' },
    });

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('findByCategory', 'products', duration);

    await this.cacheService.set(cacheKey, products, this.CACHE_TTL);
    return products;
  }

  private async invalidateProductCaches(productId?: number): Promise<void> {
    if (productId) {
      await this.cacheService.del(`product:${productId}`);
    }
    await this.cacheService.invalidatePattern('products:list:*');
    await this.cacheService.invalidatePattern('products:all');
    await this.cacheService.invalidatePattern('products:in-stock');
    await this.cacheService.invalidatePattern('products:out-of-stock');
    await this.cacheService.invalidatePattern('products:low-stock:*');
    await this.cacheService.invalidatePattern('search:*');
    await this.cacheService.invalidatePattern('products:category:*');
    this.logger.debug(`Invalidated product caches${productId ? ` for product ${productId}` : ''}`);
  }

  @Trace('products.warmCache')
  async warmCache(): Promise<void> {
    this.logger.log('Warming product cache...');
    const startTime = Date.now();

    const products = await this.findAll();
    for (const product of products) {
      await this.cacheService.set(`product:${product.id}`, product, this.CACHE_TTL);
    }

    const duration = (Date.now() - startTime) / 1000;
    this.logger.log(`Warmed cache for ${products.length} products in ${duration}s`);
  }
}