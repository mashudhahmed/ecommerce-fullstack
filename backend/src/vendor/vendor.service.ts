// src/vendor/vendor.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, MoreThan } from 'typeorm';
import { User, UserRole } from '../user/user.entity';
import { Product } from '../products/products.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { UserService } from '../user/user.service';
import { CacheService } from '../common/cache/cache.service';
import { MetricsService } from '../monitoring/metrics.service';
import { Trace } from '../common/decorators/tracing.decorator';
import { QueryTimeout } from '../common/decorators/query-timeout.decorator';
import { BULK_LIMITS } from '../common/constants/bulk-limits';
import { AnalyticsUtils } from '../common/utils/analytics.utils';
import { EventsService } from '../events/events.service';

export interface BulkUploadResult {
  success: number;
  failed: number;
  errors: {
    row: number;
    error: string;
  }[];
  created: {
    id: number;
    title: string;
  }[];
  skipped: {
    row: number;
    reason: string;
  }[];
}

export interface BulkDeleteResult {
  success: number[];
  failed: {
    id: number;
    error: string;
  }[];
}

export interface BulkActionResult {
  success: number[];
  failed: {
    id: number;
    error: string;
  }[];
}

export interface VendorStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
}

export interface VendorProfile {
  id: number;
  name: string;
  email: string;
  businessName?: string;
  businessDescription?: string;
  phoneNumber?: string;
  address?: string;
  createdAt: Date;
  stats?: VendorStats;
}

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);
  private readonly CACHE_TTL = 600;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
    private readonly eventsService: EventsService,
  ) {}

  @Trace('vendor.getPublicVendors')
  async getPublicVendors(filters: {
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<VendorProfile[]> {
    const cacheKey = `vendors:public:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get<VendorProfile[]>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for public vendors');
      this.metricsService.recordCacheHit('vendors:public');
      return cached;
    }

    this.metricsService.recordCacheMiss('vendors:public');
    const startTime = Date.now();

    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.VENDOR })
      .andWhere('user.isVendorApproved = :approved', { approved: true })
      .andWhere('user.isVerified = :verified', { verified: true });

    if (filters.search) {
      query.andWhere(
        '(user.name ILIKE :search OR user.vendorBusinessName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const allowedSortFields = ['name', 'email', 'createdAt', 'vendorBusinessName', 'id'];
    const sortField = filters.sortBy && allowedSortFields.includes(filters.sortBy)
      ? filters.sortBy
      : 'createdAt';
    const sortOrder = (filters.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    query.orderBy(`user.${sortField}`, sortOrder);

    const vendors = await query.getMany();
    const result = vendors.map((v) => this.getVendorPublicProfile(v));

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('find', 'users', duration);
    this.logger.debug(`Public vendors retrieved in ${duration}s`);

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Trace('vendor.getPublicVendorDetails')
  async getPublicVendorDetails(id: number): Promise<any> {
    const cacheKey = `vendor:public:${id}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const vendor = await this.userRepository.findOne({
      where: {
        id,
        role: UserRole.VENDOR,
        isVendorApproved: true,
        isVerified: true,
      },
      relations: ['products'],
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const stats = await this.getVendorStats(id);

    const result = {
      ...this.getVendorPublicProfile(vendor),
      stats,
      products: vendor.products?.filter((p) => p.isActive) || [],
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Trace('vendor.getVendorProfile')
  async getVendorProfile(vendorId: number): Promise<any> {
    const vendor = await this.userService.findByIdOrFail(vendorId);

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    const stats = await this.getVendorStats(vendorId);
    const products = await this.productRepository.count({
      where: { owner: { id: vendorId }, isActive: true },
    });

    return {
      ...this.userService.getPublicProfile(vendor),
      stats: {
        ...stats,
        totalProducts: products,
      },
    };
  }

  @Trace('vendor.updateVendorProfile')
  async updateVendorProfile(vendorId: number, dto: any): Promise<any> {
    const vendor = await this.userService.findByIdOrFail(vendorId);

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    const allowedFields = [
      'name',
      'vendorBusinessName',
      'vendorBusinessDescription',
      'vendorPhoneNumber',
      'vendorAddress',
      'vendorBusinessRegistration',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        updateData[field] = dto[field];
      }
    }

    const updated = await this.userService.update(vendorId, updateData);

    await this.cacheService.del(`vendor:profile:${vendorId}`);
    await this.cacheService.invalidatePattern(`vendors:public:*`);

    return this.userService.getPublicProfile(updated);
  }

  @Trace('vendor.getVendorStats')
  @QueryTimeout(15000)
  async getVendorStats(vendorId: number): Promise<VendorStats> {
    const cacheKey = `vendor:${vendorId}:stats`;
    const cached = await this.cacheService.get<VendorStats>(cacheKey);
    if (cached && typeof cached === 'object' && 'totalProducts' in cached) {
      this.logger.debug(`Cache hit for vendor stats ${vendorId}`);
      this.metricsService.recordCacheHit('vendor:stats');
      return cached;
    }

    this.metricsService.recordCacheMiss('vendor:stats');
    const startTime = Date.now();

    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        'COUNT(DISTINCT product.id) as totalProducts',
        'COUNT(DISTINCT "order".id) as totalOrders',
        'COALESCE(SUM("order".total), 0) as totalRevenue',
        `COUNT(DISTINCT CASE WHEN "order".status = 'pending' THEN "order".id END) as pendingOrders`,
        `COUNT(DISTINCT CASE WHEN "order".status = 'processing' THEN "order".id END) as processingOrders`,
        `COUNT(DISTINCT CASE WHEN "order".status = 'shipped' THEN "order".id END) as shippedOrders`,
        `COUNT(DISTINCT CASE WHEN "order".status = 'delivered' THEN "order".id END) as deliveredOrders`,
        `COUNT(DISTINCT CASE WHEN "order".status = 'cancelled' THEN "order".id END) as cancelledOrders`,
      ])
      .from(Product, 'product')
      .leftJoin('product.orderItems', 'orderItem')
      .leftJoin('orderItem.order', 'order')
      .where('product.ownerId = :vendorId', { vendorId })
      .getRawOne();

    const totalOrders = Number(result?.totalOrders || 0);
    const totalRevenue = Number(result?.totalRevenue || 0);

    const stats: VendorStats = {
      totalProducts: Number(result?.totalProducts || 0),
      totalOrders,
      totalRevenue,
      pendingOrders: Number(result?.pendingOrders || 0),
      processingOrders: Number(result?.processingOrders || 0),
      shippedOrders: Number(result?.shippedOrders || 0),
      deliveredOrders: Number(result?.deliveredOrders || 0),
      cancelledOrders: Number(result?.cancelledOrders || 0),
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('aggregate', 'orders', duration);
    this.logger.debug(`Vendor stats retrieved in ${duration}s`);

    await this.cacheService.set(cacheKey, stats, this.CACHE_TTL);
    return stats;
  }

  @Trace('vendor.getDashboardStats')
  async getDashboardStats(vendorId: number): Promise<any> {
    const stats = await this.getVendorStats(vendorId);
    const recentOrders = await this.getVendorOrders(vendorId, undefined, 1, 10);

    return {
      ...stats,
      recentOrders: recentOrders.data,
    };
  }

  @Trace('vendor.getAdminVendorStats')
  @QueryTimeout(30000)
  async getAdminVendorStats(): Promise<any> {
    const cacheKey = 'vendor:admin:stats';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    const [stats, topVendors, vendorGrowth] = await Promise.all([
      this.dataSource
        .createQueryBuilder()
        .select([
          'COUNT(*) as totalVendors',
          `COUNT(CASE WHEN isVendorApproved = true AND isVerified = true THEN 1 END) as activeVendors`,
          `COUNT(CASE WHEN isVendorApproved = false AND isVerified = true THEN 1 END) as pendingVendors`,
          `COUNT(CASE WHEN isVendorRejected = true THEN 1 END) as rejectedVendors`,
          `COUNT(CASE WHEN isVendorApproved = true AND isVerified = false THEN 1 END) as suspendedVendors`,
        ])
        .from(User, 'user')
        .where('user.role = :role', { role: UserRole.VENDOR })
        .getRawOne(),

      this.dataSource
        .createQueryBuilder()
        .select([
          'user.id as id',
          'user.name as name',
          'user.vendorBusinessName as businessName',
          'COALESCE(SUM("order".total), 0) as revenue',
          'COUNT(DISTINCT "order".id) as orders',
          'COUNT(DISTINCT product.id) as products',
        ])
        .from(User, 'user')
        .leftJoin('user.products', 'product')
        .leftJoin('product.orderItems', 'orderItem')
        .leftJoin('orderItem.order', 'order')
        .where('user.role = :role', { role: UserRole.VENDOR })
        .andWhere('user.isVendorApproved = true')
        .andWhere('order.status != :cancelled', { cancelled: 'cancelled' })
        .groupBy('user.id, user.name, user.vendorBusinessName')
        .orderBy('revenue', 'DESC')
        .limit(10)
        .getRawMany(),

      this.dataSource
        .createQueryBuilder()
        .select([
          'DATE(user.createdAt) as date',
          'COUNT(*) as count',
        ])
        .from(User, 'user')
        .where('user.role = :role', { role: UserRole.VENDOR })
        .groupBy('DATE(user.createdAt)')
        .orderBy('date', 'ASC')
        .limit(30)
        .getRawMany(),
    ]);

    const result = {
      totalVendors: Number(stats?.totalVendors || 0),
      activeVendors: Number(stats?.activeVendors || 0),
      pendingVendors: Number(stats?.pendingVendors || 0),
      rejectedVendors: Number(stats?.rejectedVendors || 0),
      suspendedVendors: Number(stats?.suspendedVendors || 0),
      topVendors: topVendors || [],
      vendorGrowth: vendorGrowth || [],
    };

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('aggregate', 'users', duration);
    this.logger.debug(`Admin vendor stats retrieved in ${duration}s`);

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  @Trace('vendor.getVendorOrders')
  @QueryTimeout(20000)
  async getVendorOrders(
    vendorId: number,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; meta: any }> {
    const cacheKey = `vendor:${vendorId}:orders:${status || 'all'}:${page}:${limit}`;
    const cached = await this.cacheService.get<{ data: any[]; meta: any }>(cacheKey);
    
    // ✅ FIX: Check if cached has the required properties
    if (cached && typeof cached === 'object' && 'data' in cached && 'meta' in cached) {
      this.metricsService.recordCacheHit('vendor:orders');
      return cached;
    }

    this.metricsService.recordCacheMiss('vendor:orders');
    const startTime = Date.now();

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.owner', 'owner')
      .where('owner.id = :vendorId', { vendorId });

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    const [data, total] = await query
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const filteredData = data.map((order) => ({
      ...order,
      items: order.items.filter((item) => item.product.owner?.id === vendorId),
    }));

    const result = {
      data: filteredData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('find', 'orders', duration);
    this.logger.debug(`Vendor orders retrieved in ${duration}s`);

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  @Trace('vendor.getVendorOrderSummary')
  async getVendorOrderSummary(vendorId: number): Promise<any> {
    const stats = await this.getVendorStats(vendorId);
    const recentOrders = await this.getVendorOrders(vendorId, undefined, 1, 10);

    return {
      ...stats,
      recentOrders: recentOrders.data,
    };
  }

  @Trace('vendor.getVendorProducts')
  @QueryTimeout(15000)
  async getVendorProducts(
    vendorId: number,
    page: number = 1,
    limit: number = 20,
    inStock?: boolean,
  ): Promise<{ data: Product[]; meta: any }> {
    const cacheKey = `vendor:${vendorId}:products:${inStock !== undefined ? (inStock ? 'in-stock' : 'out-of-stock') : 'all'}:${page}:${limit}`;
    const cached = await this.cacheService.get<{ data: Product[]; meta: any }>(cacheKey);
    
    // ✅ FIX: Check if cached has the required properties
    if (cached && typeof cached === 'object' && 'data' in cached && 'meta' in cached) {
      this.metricsService.recordCacheHit('vendor:products');
      return cached;
    }

    this.metricsService.recordCacheMiss('vendor:products');
    const startTime = Date.now();

    const query = this.productRepository
      .createQueryBuilder('product')
      .where('product.ownerId = :vendorId', { vendorId })
      .andWhere('product.isActive = :isActive', { isActive: true });

    if (inStock !== undefined) {
      if (inStock) {
        query.andWhere('product.stock > 0');
      } else {
        query.andWhere('product.stock = 0');
      }
    }

    const [data, total] = await query
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const result = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('find', 'products', duration);

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  @Trace('vendor.getProductStats')
  async getProductStats(vendorId: number): Promise<any> {
    const cacheKey = `vendor:${vendorId}:product:stats`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const products = await this.productRepository.find({
      where: { owner: { id: vendorId } },
    });

    const result = {
      totalProducts: products.length,
      inStock: products.filter((p) => p.stock > 0).length,
      outOfStock: products.filter((p) => p.stock === 0).length,
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= 5).length,
      totalStock: products.reduce((sum, p) => sum + p.stock, 0),
    };

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  @Trace('vendor.bulkUploadProducts')
  @QueryTimeout(60000)
  async bulkUploadProducts(vendorId: number, products: any[]): Promise<BulkUploadResult> {
    const MAX_BULK = BULK_LIMITS.PRODUCTS.MAX_BULK_UPLOAD;

    if (products.length > MAX_BULK) {
      throw new BadRequestException(
        `Maximum ${MAX_BULK} products can be uploaded at once. ` +
        `You provided ${products.length}. Please split into smaller batches.`
      );
    }

    if (products.length === 0) {
      throw new BadRequestException('No products provided for upload');
    }

    const vendor = await this.userService.findByIdOrFail(vendorId);
    if (vendor.role !== UserRole.VENDOR || !vendor.isVendorApproved) {
      throw new ForbiddenException('Vendor is not approved');
    }

    const result: BulkUploadResult = {
      success: 0,
      failed: 0,
      errors: [],
      created: [],
      skipped: [],
    };

    const productEntities: Partial<Product>[] = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const row = i + 1;

      if (!p.title) {
        result.failed++;
        result.errors.push({ row, error: 'Title is required' });
        continue;
      }
      if (p.price === undefined || p.price === null || p.price <= 0) {
        result.failed++;
        result.errors.push({ row, error: 'Price must be greater than 0' });
        continue;
      }
      if (p.stock === undefined || p.stock === null || p.stock < 0) {
        result.failed++;
        result.errors.push({ row, error: 'Stock must be 0 or greater' });
        continue;
      }

      productEntities.push({
        title: p.title,
        price: p.price,
        description: p.description || '',
        stock: p.stock || 0,
        imageUrl: p.imageUrl,
        owner: vendor,
        isActive: true,
      });
    }

    if (productEntities.length > 0) {
      const saved = await this.productRepository.save(productEntities as any);
      result.success = saved.length;
      result.created = saved.map((p: Product) => ({ id: p.id, title: p.title }));

      for (const p of saved) {
        this.metricsService.recordProductCreation(vendorId);
      }
      this.logger.log(`Bulk upload: ${result.success} created, ${result.failed} failed`);
    }

    await this.cacheService.del(`vendor:${vendorId}:products:*`);
    await this.cacheService.invalidatePattern(`vendor:${vendorId}:stats`);

    return result;
  }

  @Trace('vendor.bulkDeleteProducts')
  @QueryTimeout(30000)
  async bulkDeleteProducts(vendorId: number, productIds: number[]): Promise<BulkDeleteResult> {
    const MAX_BULK = BULK_LIMITS.PRODUCTS.MAX_BULK_DELETE;

    if (productIds.length > MAX_BULK) {
      throw new BadRequestException(
        `Maximum ${MAX_BULK} products can be deleted at once. ` +
        `You provided ${productIds.length}. Please split into smaller batches.`
      );
    }

    if (productIds.length === 0) {
      throw new BadRequestException('No product IDs provided for deletion');
    }

    const result: BulkDeleteResult = {
      success: [],
      failed: [],
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const id of productIds) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id, owner: { id: vendorId } },
        });
        if (!product) {
          result.failed.push({ id, error: 'Product not found or does not belong to vendor' });
          continue;
        }
        product.isActive = false;
        await queryRunner.manager.save(product);
        result.success.push(id);
        await this.cacheService.del(`product:${id}`);
      }
      await queryRunner.commitTransaction();
      this.logger.log(`Bulk delete: ${result.success.length} deleted, ${result.failed.length} failed`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await this.cacheService.del(`vendor:${vendorId}:products:*`);
    await this.cacheService.invalidatePattern(`vendor:${vendorId}:stats`);

    return result;
  }

  @Trace('vendor.bulkVendorAction')
  @QueryTimeout(30000)
  async bulkVendorAction(
    action: string,
    vendorIds: number[],
    reason?: string,
  ): Promise<BulkActionResult> {
    const MAX_BULK = BULK_LIMITS.VENDORS.MAX_BULK_ACTION;

    if (vendorIds.length > MAX_BULK) {
      throw new BadRequestException(
        `Maximum ${MAX_BULK} vendors can be processed at once. ` +
        `You provided ${vendorIds.length}. Please split into smaller batches.`
      );
    }

    if (vendorIds.length === 0) {
      throw new BadRequestException('No vendor IDs provided');
    }

    const result: BulkActionResult = {
      success: [],
      failed: [],
    };

    const validActions = ['approve', 'reject', 'suspend', 'activate'];
    if (!validActions.includes(action)) {
      throw new BadRequestException(`Invalid action: ${action}. Allowed: ${validActions.join(', ')}`);
    }

    for (const vendorId of vendorIds) {
      try {
        const vendor = await this.userService.findByIdOrFail(vendorId);

        if (vendor.role !== UserRole.VENDOR) {
          result.failed.push({ id: vendorId, error: 'User is not a vendor' });
          continue;
        }

        switch (action) {
          case 'approve':
            if (vendor.isVendorApproved) {
              result.failed.push({ id: vendorId, error: 'Vendor already approved' });
              continue;
            }
            vendor.isVendorApproved = true;
            vendor.isVendorRejected = false;
            vendor.vendorRejectionReason = null;
            break;

          case 'reject':
            if (vendor.isVendorRejected) {
              result.failed.push({ id: vendorId, error: 'Vendor already rejected' });
              continue;
            }
            vendor.isVendorRejected = true;
            vendor.isVendorApproved = false;
            vendor.vendorRejectionReason = reason || 'No reason provided';
            break;

          case 'suspend':
            if (!vendor.isVendorApproved) {
              result.failed.push({ id: vendorId, error: 'Vendor already suspended or not approved' });
              continue;
            }
            vendor.isVendorApproved = false;
            vendor.isVendorRejected = false;
            vendor.vendorRejectionReason = reason || 'Suspended by admin';
            break;

          case 'activate':
            if (vendor.isVendorApproved) {
              result.failed.push({ id: vendorId, error: 'Vendor already active' });
              continue;
            }
            vendor.isVendorApproved = true;
            vendor.isVendorRejected = false;
            vendor.vendorRejectionReason = null;
            break;
        }

        await this.userRepository.save(vendor);
        result.success.push(vendorId);

        if (action === 'approve') {
          this.eventsService.emitVendorApproved({
            vendorId: vendor.id,
            email: vendor.email,
            name: vendor.name,
            businessName: vendor.vendorBusinessName || '',
            status: 'approved',
          });
        } else if (action === 'reject') {
          this.eventsService.emitVendorRejected({
            vendorId: vendor.id,
            email: vendor.email,
            name: vendor.name,
            businessName: vendor.vendorBusinessName || '',
            status: 'rejected',
          });
        }

        this.logger.log(`Vendor ${vendorId} ${action}d`);
      } catch (error: any) {
        result.failed.push({ id: vendorId, error: error.message || 'Unknown error' });
      }
    }

    await this.cacheService.del('vendor:admin:stats');
    await this.cacheService.invalidatePattern('vendors:public:*');

    return result;
  }

  @Trace('vendor.suspendVendor')
  async suspendVendor(
    vendorId: number,
    suspended: boolean,
    reason?: string,
  ): Promise<User> {
    const vendor = await this.userService.findByIdOrFail(vendorId);

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    if (suspended) {
      if (!vendor.isVendorApproved) {
        throw new BadRequestException('Vendor is already suspended or not approved');
      }
      vendor.isVendorApproved = false;
      vendor.isVendorRejected = false;
      vendor.vendorRejectionReason = reason || 'Suspended by admin';
      this.logger.log(`Vendor ${vendorId} suspended by admin`);
      
      this.eventsService.emitVendorRejected({
        vendorId: vendor.id,
        email: vendor.email,
        name: vendor.name,
        businessName: vendor.vendorBusinessName || '',
        status: 'rejected',
      });
    } else {
      if (vendor.isVendorApproved) {
        throw new BadRequestException('Vendor is already active');
      }
      vendor.isVendorApproved = true;
      vendor.isVendorRejected = false;
      vendor.vendorRejectionReason = null;
      this.logger.log(`Vendor ${vendorId} activated by admin`);
      
      this.eventsService.emitVendorApproved({
        vendorId: vendor.id,
        email: vendor.email,
        name: vendor.name,
        businessName: vendor.vendorBusinessName || '',
        status: 'approved',
      });
    }

    const updated = await this.userRepository.save(vendor);

    await this.cacheService.del(`vendor:${vendorId}:stats`);
    await this.cacheService.del('vendor:admin:stats');
    await this.cacheService.invalidatePattern('vendors:public:*');

    return updated;
  }

  @Trace('vendor.toggleProductStatus')
  async toggleProductStatus(
    vendorId: number,
    productId: number,
    isActive: boolean,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId, owner: { id: vendorId } },
    });

    if (!product) {
      throw new NotFoundException('Product not found or does not belong to vendor');
    }

    product.isActive = isActive;
    const updated = await this.productRepository.save(product);
    this.logger.log(`Product ${productId} status updated to ${isActive} by vendor ${vendorId}`);

    await this.cacheService.del(`product:${productId}`);
    await this.cacheService.del(`vendor:${vendorId}:products:*`);
    await this.cacheService.del(`vendor:${vendorId}:product:stats`);

    return updated;
  }

  @Trace('vendor.exportOrders')
  @QueryTimeout(30000)
  async exportOrders(
    vendorId: number,
    format: string,
    startDate?: string,
    endDate?: string,
    status?: string,
  ): Promise<{ data: any[]; filename: string; contentType: string }> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await this.getOrdersWithDateRange(vendorId, start, end);

    let filteredOrders = orders;
    if (status) {
      filteredOrders = filteredOrders.filter((o) => o.status === status);
    }

    const exportData = filteredOrders.map((order) => ({
      'Order ID': order.id,
      Customer: order.user?.name || 'N/A',
      Email: order.user?.email || 'N/A',
      Total: Number(order.total).toFixed(2),
      Status: order.status,
      Items: order.items?.length || 0,
      'Order Date': new Date(order.createdAt).toISOString().split('T')[0],
    }));

    const filename = `orders_export_${new Date().toISOString().split('T')[0]}`;

    const contentTypeMap: Record<string, string> = {
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      json: 'application/json',
      pdf: 'application/pdf',
    };

    return {
      data: exportData,
      filename,
      contentType: contentTypeMap[format] || 'application/json',
    };
  }

  private async getOrdersWithDateRange(
    vendorId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Order[]> {
    return this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.owner', 'owner')
      .where('owner.id = :vendorId', { vendorId })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();
  }

  @Trace('vendor.getPerformanceMetrics')
  @QueryTimeout(20000)
  async getPerformanceMetrics(
    vendorId: number,
    period: 'day' | 'week' | 'month' | 'year' = 'month',
  ): Promise<any> {
    const cacheKey = `vendor:${vendorId}:performance:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        previousStartDate = new Date(startDate);
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
    }

    const [currentOrders, previousOrders] = await Promise.all([
      this.getOrdersWithDateRange(vendorId, startDate, new Date()),
      this.getOrdersWithDateRange(vendorId, previousStartDate, startDate),
    ]);

    const totalRevenue = currentOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const totalOrders = currentOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const previousRevenue = previousOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const salesTrend = AnalyticsUtils.groupByDay(currentOrders);
    const topProducts = await this.getTopProducts(vendorId, 10);

    const result = {
      salesTrend,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      growthRate,
      topProducts,
      period,
      comparison: {
        previousRevenue,
        revenueChange: totalRevenue - previousRevenue,
        previousOrders: previousOrders.length,
        ordersChange: totalOrders - previousOrders.length,
      },
    };

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  @Trace('vendor.getRevenueAnalytics')
  @QueryTimeout(20000)
  async getRevenueAnalytics(
    vendorId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const cacheKey = `vendor:${vendorId}:revenue:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const orders = await this.getOrdersWithDateRange(vendorId, startDate, endDate);

    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const result = {
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        period: { start: startDate, end: endDate },
      },
      dailyData: AnalyticsUtils.groupByDay(orders),
      weeklyData: AnalyticsUtils.groupByWeek(orders),
      monthlyData: AnalyticsUtils.groupByMonth(orders),
      statusDistribution: AnalyticsUtils.getStatusRevenueDistribution(orders),
    };

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  @Trace('vendor.getOrderAnalytics')
  @QueryTimeout(20000)
  async getOrderAnalytics(vendorId: number): Promise<any> {
    const cacheKey = `vendor:${vendorId}:order:analytics`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const orders = await this.getOrdersWithDateRange(
      vendorId,
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      new Date(),
    );

    const result = {
      orderTrends: AnalyticsUtils.groupByDay(orders),
      statusDistribution: AnalyticsUtils.getStatusDistribution(orders),
      peakHours: AnalyticsUtils.getPeakHours(orders),
      averageProcessingTime: AnalyticsUtils.calculateAverageProcessingTime(orders),
      averageDeliveryTime: AnalyticsUtils.calculateAverageDeliveryTime(orders),
      topCustomers: AnalyticsUtils.getTopCustomers(orders, 10),
    };

    await this.cacheService.set(cacheKey, result, 600);
    return result;
  }

  @Trace('vendor.getVendorReviews')
  @QueryTimeout(15000)
  async getVendorReviews(
    vendorId: number,
    page: number = 1,
    limit: number = 20,
    rating?: number,
  ): Promise<{ data: any[]; meta: any; stats: any }> {
    return {
      data: [],
      meta: {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
      stats: {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    };
  }

  @Trace('vendor.getVendorReviewStats')
  async getVendorReviewStats(vendorId: number): Promise<any> {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  private getVendorPublicProfile(vendor: User): VendorProfile {
    return {
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      businessName: vendor.vendorBusinessName,
      businessDescription: vendor.vendorBusinessDescription,
      phoneNumber: vendor.vendorPhoneNumber,
      address: vendor.vendorAddress,
      createdAt: vendor.createdAt,
    };
  }

  private async getTopProducts(vendorId: number, limit: number = 10): Promise<any[]> {
    const orderItems = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .leftJoinAndSelect('orderItem.product', 'product')
      .leftJoinAndSelect('orderItem.order', 'order')
      .where('product.ownerId = :vendorId', { vendorId })
      .andWhere('order.status != :status', { status: 'cancelled' })
      .getMany();

    const productStats: Record<number, { id: number; title: string; sold: number; revenue: number }> = {};

    for (const item of orderItems) {
      const key = item.product.id;
      if (!productStats[key]) {
        productStats[key] = {
          id: item.product.id,
          title: item.product.title,
          sold: 0,
          revenue: 0,
        };
      }
      productStats[key].sold += item.quantity;
      productStats[key].revenue += Number(item.price) * item.quantity;
    }

    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }
}