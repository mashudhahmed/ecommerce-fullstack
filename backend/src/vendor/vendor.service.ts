// src/vendor/vendor.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, In } from 'typeorm';
import { User, UserRole } from '../user/user.entity';
import { Product } from '../products/products.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

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
  ) {}

  // ============================================================
  // PUBLIC VENDOR METHODS
  // ============================================================

  async getPublicVendors(filters: {
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<any[]> {
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

    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = (filters.sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC';
    query.orderBy(`user.${sortField}`, sortOrder);

    const vendors = await query.getMany();
    return vendors.map((v) => this.getVendorPublicProfile(v));
  }

  async getPublicVendorDetails(id: number): Promise<any> {
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

    return {
      ...this.getVendorPublicProfile(vendor),
      stats,
      products: vendor.products?.filter((p) => p.isActive) || [],
    };
  }

  // ============================================================
  // VENDOR PROFILE METHODS
  // ============================================================

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
    return this.userService.getPublicProfile(updated);
  }

  // ============================================================
  // VENDOR STATS METHODS
  // ============================================================

  async getVendorStats(vendorId: number): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
  }> {
    const products = await this.productRepository.find({
      where: { owner: { id: vendorId } },
    });

    const productIds = products.map((p) => p.id);

    if (productIds.length === 0) {
      return {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        averageOrderValue: 0,
      };
    }

    const orderItems = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .leftJoinAndSelect('orderItem.order', 'order')
      .where('orderItem.productId IN (:...productIds)', { productIds })
      .getMany();

    const orderIds = [...new Set(orderItems.map((oi) => oi.order.id))];

    if (orderIds.length === 0) {
      return {
        totalProducts: products.length,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        averageOrderValue: 0,
      };
    }

    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.id IN (:...orderIds)', { orderIds })
      .getMany();

    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const processingOrders = orders.filter((o) => o.status === 'processing').length;
    const shippedOrders = orders.filter((o) => o.status === 'shipped').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalProducts: products.length,
      totalOrders,
      totalRevenue,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      averageOrderValue,
    };
  }

  async getDashboardStats(vendorId: number): Promise<any> {
    const stats = await this.getVendorStats(vendorId);
    const recentOrders = await this.getVendorOrders(vendorId, undefined, 1, 10);

    return {
      ...stats,
      recentOrders: recentOrders.data,
    };
  }

  // ============================================================
  // VENDOR PERFORMANCE METRICS
  // ============================================================

  async getPerformanceMetrics(
    vendorId: number,
    period: 'day' | 'week' | 'month' | 'year' = 'month',
  ): Promise<any> {
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

    const currentOrders = await this.getVendorOrdersWithDateRange(vendorId, startDate, new Date());
    const previousOrders = await this.getVendorOrdersWithDateRange(vendorId, previousStartDate, startDate);

    const totalRevenue = currentOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const totalOrders = currentOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const previousRevenue = previousOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const salesTrend = this.groupByDay(currentOrders);
    const topProducts = await this.getTopProducts(vendorId, 10);

    return {
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
  }

  // ============================================================
  // VENDOR REVENUE ANALYTICS
  // ============================================================

  async getRevenueAnalytics(
    vendorId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const orders = await this.getVendorOrdersWithDateRange(vendorId, startDate, endDate);

    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const dailyData = this.groupByDay(orders);
    const weeklyData = this.groupByWeek(orders);
    const monthlyData = this.groupByMonth(orders);
    const statusDistribution = this.getStatusDistributionWithRevenue(orders);

    return {
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        period: { start: startDate, end: endDate },
      },
      dailyData,
      weeklyData,
      monthlyData,
      statusDistribution,
    };
  }

  // ============================================================
  // VENDOR ORDER ANALYTICS
  // ============================================================

  async getOrderAnalytics(vendorId: number): Promise<any> {
    const orders = await this.getVendorOrdersWithDateRange(
      vendorId,
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      new Date(),
    );

    const orderTrends = this.groupByDay(orders);
    const statusDistribution = this.getStatusDistribution(orders);
    const peakHours = this.getPeakHours(orders);
    const averageProcessingTime = this.calculateAverageProcessingTime(orders);
    const averageDeliveryTime = this.calculateAverageDeliveryTime(orders);
    const topCustomers = this.getTopCustomers(orders, 10);

    return {
      orderTrends,
      statusDistribution,
      peakHours,
      averageProcessingTime,
      averageDeliveryTime,
      topCustomers,
    };
  }

  // ============================================================
  // VENDOR ORDER METHODS
  // ============================================================

  async getVendorOrders(
    vendorId: number,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; meta: any }> {
    const products = await this.productRepository.find({
      where: { owner: { id: vendorId } },
    });

    const productIds = products.map((p) => p.id);

    if (productIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    const query = this.orderItemRepository
      .createQueryBuilder('orderItem')
      .leftJoinAndSelect('orderItem.order', 'order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('orderItem.product', 'product')
      .where('orderItem.productId IN (:...productIds)', { productIds });

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    const orderItems = await query.getMany();
    const orderIds = [...new Set(orderItems.map((oi) => oi.order.id))];

    if (orderIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.id IN (:...orderIds)', { orderIds })
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .orderBy('order.createdAt', 'DESC')
      .getMany();

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = orders.slice(start, end);

    const filteredOrders = paginated.map((order) => ({
      ...order,
      items: order.items.filter((item) => productIds.includes(item.product.id)),
    }));

    return {
      data: filteredOrders,
      meta: {
        total: orders.length,
        page,
        limit,
        totalPages: Math.ceil(orders.length / limit),
      },
    };
  }

  async getVendorOrderSummary(vendorId: number): Promise<any> {
    const stats = await this.getVendorStats(vendorId);
    const recentOrders = await this.getVendorOrders(vendorId, undefined, 1, 10);

    return {
      ...stats,
      recentOrders: recentOrders.data,
    };
  }

  private async getVendorOrdersWithDateRange(
    vendorId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Order[]> {
    const products = await this.productRepository.find({
      where: { owner: { id: vendorId } },
    });

    const productIds = products.map((p) => p.id);

    if (productIds.length === 0) {
      return [];
    }

    const orderItems = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .leftJoinAndSelect('orderItem.order', 'order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('orderItem.product', 'product')
      .where('orderItem.productId IN (:...productIds)', { productIds })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    const orderIds = [...new Set(orderItems.map((oi) => oi.order.id))];

    if (orderIds.length === 0) {
      return [];
    }

    return this.orderRepository
      .createQueryBuilder('order')
      .where('order.id IN (:...orderIds)', { orderIds })
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .getMany();
  }

  // ============================================================
  // VENDOR PRODUCT METHODS
  // ============================================================

  async getVendorProducts(
    vendorId: number,
    page: number = 1,
    limit: number = 20,
    inStock?: boolean,
  ): Promise<{ data: any[]; meta: any }> {
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

    const [products, total] = await query
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductStats(vendorId: number): Promise<any> {
    const products = await this.productRepository.find({
      where: { owner: { id: vendorId } },
    });

    const totalProducts = products.length;
    const inStock = products.filter((p) => p.stock > 0).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

    return {
      totalProducts,
      inStock,
      outOfStock,
      lowStock,
      totalStock,
    };
  }

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
    return updated;
  }

  // ============================================================
  // BULK PRODUCT OPERATIONS
  // ============================================================

  async bulkUploadProducts(
    vendorId: number,
    products: any[],
  ): Promise<any> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as { row: number; error: string }[],
      created: [] as { id: number; title: string }[],
      skipped: [] as { row: number; reason: string }[],
    };

    const vendor = await this.userService.findByIdOrFail(vendorId);
    if (vendor.role !== UserRole.VENDOR || !vendor.isVendorApproved) {
      throw new ForbiddenException('Vendor is not approved');
    }

    for (let i = 0; i < products.length; i++) {
      try {
        const productData = products[i];
        const row = i + 1;

        if (!productData.title) {
          result.failed++;
          result.errors.push({ row, error: 'Title is required' });
          continue;
        }

        if (!productData.price || productData.price <= 0) {
          result.failed++;
          result.errors.push({ row, error: 'Price must be greater than 0' });
          continue;
        }

        if (productData.stock === undefined || productData.stock < 0) {
          result.failed++;
          result.errors.push({ row, error: 'Stock must be 0 or greater' });
          continue;
        }

        const product = this.productRepository.create({
          title: productData.title,
          price: productData.price,
          description: productData.description || '',
          stock: productData.stock || 0,
          imageUrl: productData.imageUrl,
          owner: vendor,
          isActive: true,
        });

        const saved = await this.productRepository.save(product);
        result.success++;
        result.created.push({ id: saved.id, title: saved.title });
      } catch (error: any) {
        result.failed++;
        result.errors.push({ row: i + 1, error: error.message || 'Unknown error' });
      }
    }

    this.logger.log(`Bulk upload completed: ${result.success} created, ${result.failed} failed`);
    return result;
  }

  async bulkDeleteProducts(
    vendorId: number,
    productIds: number[],
  ): Promise<{ success: number[]; failed: { id: number; error: string }[] }> {
    const result = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const productId of productIds) {
      try {
        const product = await this.productRepository.findOne({
          where: { id: productId, owner: { id: vendorId } },
        });

        if (!product) {
          result.failed.push({ id: productId, error: 'Product not found or does not belong to vendor' });
          continue;
        }

        product.isActive = false;
        await this.productRepository.save(product);
        result.success.push(productId);
      } catch (error: any) {
        result.failed.push({ id: productId, error: error.message || 'Unknown error' });
      }
    }

    this.logger.log(`Bulk delete completed: ${result.success.length} deleted, ${result.failed.length} failed`);
    return result;
  }

  // ============================================================
  // EXPORT ORDERS
  // ============================================================

  async exportOrders(
    vendorId: number,
    format: string,
    startDate?: string,
    endDate?: string,
    status?: string,
  ): Promise<{ data: any[]; filename: string; contentType: string }> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let orders = await this.getVendorOrdersWithDateRange(vendorId, start, end);

    if (status) {
      orders = orders.filter((o) => o.status === status);
    }

    const exportData = orders.map((order) => ({
      'Order ID': order.id,
      Customer: order.user?.name || 'N/A',
      Email: order.user?.email || 'N/A',
      Total: Number(order.total).toFixed(2),
      Status: order.status,
      Items: order.items?.length || 0,
      'Order Date': new Date(order.createdAt).toISOString().split('T')[0],
    }));

    const filename = `orders_export_${new Date().toISOString().split('T')[0]}`;

    return {
      data: exportData,
      filename,
      contentType: format === 'csv' ? 'text/csv' : 
                   format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                   'application/json',
    };
  }

  // ============================================================
  // VENDOR REVIEWS (Placeholder - Will be implemented with Review module)
  // ============================================================

  async getVendorReviews(
    vendorId: number,
    page: number = 1,
    limit: number = 20,
    rating?: number,
  ): Promise<{ data: any[]; meta: any; stats: any }> {
    // This will be implemented when Review module is added
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

  async getVendorReviewStats(vendorId: number): Promise<any> {
    // This will be implemented when Review module is added
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  // ============================================================
  // VENDOR NOTIFICATIONS (Placeholder - Will be implemented with Notification module)
  // ============================================================

  async getVendorNotifications(
    vendorId: number,
    page: number = 1,
    limit: number = 20,
    read?: boolean,
  ): Promise<{ data: any[]; meta: any }> {
    // This will be implemented when Notification module is added
    return {
      data: [],
      meta: {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
    };
  }

  async markNotificationRead(vendorId: number, notificationId: number): Promise<any> {
    // This will be implemented when Notification module is added
    return { message: 'Notification marked as read' };
  }

  async markAllNotificationsRead(vendorId: number): Promise<any> {
    // This will be implemented when Notification module is added
    return { message: 'All notifications marked as read' };
  }

  // ============================================================
  // VENDOR SETTINGS (Placeholder)
  // ============================================================

  async getVendorSettings(vendorId: number): Promise<any> {
    const vendor = await this.userService.findByIdOrFail(vendorId);
    // Settings would be stored in a separate table
    return {
      shippingSettings: {},
      paymentSettings: {},
      notificationPreferences: {},
      businessHours: {},
      notes: '',
    };
  }

  async updateVendorSettings(vendorId: number, dto: any): Promise<any> {
    const vendor = await this.userService.findByIdOrFail(vendorId);
    // Settings would be stored in a separate table
    return {
      message: 'Settings updated successfully',
      settings: dto,
    };
  }

  // ============================================================
  // VENDOR SOCIAL LINKS (Placeholder)
  // ============================================================

  async getVendorSocialLinks(vendorId: number): Promise<any> {
    const vendor = await this.userService.findByIdOrFail(vendorId);
    // Social links would be stored in a separate table
    return {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: '',
    };
  }

  async updateVendorSocialLinks(vendorId: number, dto: any): Promise<any> {
    const vendor = await this.userService.findByIdOrFail(vendorId);
    // Social links would be stored in a separate table
    return {
      message: 'Social links updated successfully',
      links: dto,
    };
  }

  // ============================================================
  // ADMIN VENDOR MANAGEMENT
  // ============================================================

  async getAdminVendorStats(): Promise<any> {
    const [
      totalVendors,
      activeVendors,
      pendingVendors,
      rejectedVendors,
      suspendedVendors,
      topVendors,
      vendorGrowth,
    ] = await Promise.all([
      this.userRepository.count({ where: { role: UserRole.VENDOR } }),
      this.userRepository.count({
        where: { role: UserRole.VENDOR, isVendorApproved: true, isVerified: true },
      }),
      this.userRepository.count({
        where: { role: UserRole.VENDOR, isVendorApproved: false, isVerified: true },
      }),
      this.userRepository.count({
        where: { role: UserRole.VENDOR, isVendorRejected: true },
      }),
      this.userRepository.count({
        where: { role: UserRole.VENDOR, isVendorApproved: true, isVerified: false },
      }),
      this.getTopVendors(10),
      this.getVendorGrowth(),
    ]);

    return {
      totalVendors,
      activeVendors,
      pendingVendors,
      rejectedVendors,
      suspendedVendors,
      topVendors,
      vendorGrowth,
    };
  }

  private async getTopVendors(limit: number): Promise<any[]> {
    const vendors = await this.userRepository.find({
      where: { role: UserRole.VENDOR, isVendorApproved: true },
      select: ['id', 'name', 'email', 'vendorBusinessName'],
    });

    const vendorStats: Array<{
      id: number;
      name: string;
      businessName: string;
      revenue: number;
      orders: number;
    }> = [];

    for (const vendor of vendors) {
      const stats = await this.getVendorStats(vendor.id);
      vendorStats.push({
        id: vendor.id,
        name: vendor.name,
        businessName: vendor.vendorBusinessName || '',
        revenue: stats.totalRevenue,
        orders: stats.totalOrders,
      });
    }

    return vendorStats
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, limit);
  }

  private async getVendorGrowth(): Promise<any[]> {
    const vendors = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.VENDOR })
      .select('DATE(user.createdAt) as date')
      .addSelect('COUNT(*) as count')
      .groupBy('DATE(user.createdAt)')
      .orderBy('date', 'ASC')
      .limit(30)
      .getRawMany();

    return vendors.map((v) => ({
      date: v.date,
      count: parseInt(v.count, 10),
    }));
  }

  async bulkVendorAction(
    action: string,
    vendorIds: number[],
    reason?: string,
  ): Promise<{ success: number[]; failed: { id: number; error: string }[] }> {
    const result = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

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

          default:
            result.failed.push({ id: vendorId, error: `Unknown action: ${action}` });
            continue;
        }

        await this.userRepository.save(vendor);
        result.success.push(vendorId);
        this.logger.log(`Vendor ${vendorId} ${action}d by admin`);
      } catch (error: any) {
        result.failed.push({ id: vendorId, error: error.message || 'Unknown error' });
      }
    }

    return result;
  }

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
    } else {
      if (vendor.isVendorApproved) {
        throw new BadRequestException('Vendor is already active');
      }
      vendor.isVendorApproved = true;
      vendor.isVendorRejected = false;
      vendor.vendorRejectionReason = null;
      this.logger.log(`Vendor ${vendorId} activated by admin`);
    }

    const updated = await this.userRepository.save(vendor);
    return updated;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private getVendorPublicProfile(vendor: User): any {
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

    const productStats: any = {};

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
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  private groupByDay(orders: Order[]): any[] {
    const grouped: any = {};
    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { date, revenue: 0, orders: 0 };
      }
      grouped[date].revenue += Number(order.total);
      grouped[date].orders += 1;
    }
    return Object.values(grouped);
  }

  private groupByWeek(orders: Order[]): any[] {
    const grouped: any = {};
    for (const order of orders) {
      const date = new Date(order.createdAt);
      const week = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
      if (!grouped[week]) {
        grouped[week] = { week, revenue: 0, orders: 0 };
      }
      grouped[week].revenue += Number(order.total);
      grouped[week].orders += 1;
    }
    return Object.values(grouped);
  }

  private groupByMonth(orders: Order[]): any[] {
    const grouped: any = {};
    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      const month = date.substring(0, 7);
      if (!grouped[month]) {
        grouped[month] = { month, revenue: 0, orders: 0 };
      }
      grouped[month].revenue += Number(order.total);
      grouped[month].orders += 1;
    }
    return Object.values(grouped);
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  private getStatusDistribution(orders: Order[]): any[] {
    const distribution: any = {};
    const total = orders.length;
    for (const order of orders) {
      distribution[order.status] = (distribution[order.status] || 0) + 1;
    }
    return Object.entries(distribution).map(([status, count]) => ({
      status,
      count: count as number,
      percentage: total > 0 ? ((count as number) / total) * 100 : 0,
    }));
  }

  private getStatusDistributionWithRevenue(orders: Order[]): any[] {
    const distribution: any = {};
    for (const order of orders) {
      if (!distribution[order.status]) {
        distribution[order.status] = { count: 0, revenue: 0 };
      }
      distribution[order.status].count += 1;
      distribution[order.status].revenue += Number(order.total);
    }
    return Object.entries(distribution).map(([status, data]: [string, any]) => ({
      status,
      count: data.count,
      revenue: data.revenue,
    }));
  }

  private getPeakHours(orders: Order[]): any[] {
    const hours: any = {};
    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    }
    return Object.entries(hours)
      .map(([hour, count]) => ({ hour: parseInt(hour, 10), orders: count as number }))
      .sort((a, b) => b.orders - a.orders);
  }

  private calculateAverageProcessingTime(orders: Order[]): number {
    const processedOrders = orders.filter(
      (o) => o.status === 'delivered' || o.status === 'shipped',
    );
    if (processedOrders.length === 0) return 0;

    let totalHours = 0;
    for (const order of processedOrders) {
      const hours = (new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
      totalHours += Math.min(hours, 168);
    }
    return totalHours / processedOrders.length;
  }

  private calculateAverageDeliveryTime(orders: Order[]): number {
    const deliveredOrders = orders.filter((o) => o.status === 'delivered');
    if (deliveredOrders.length === 0) return 0;

    let totalDays = 0;
    for (const order of deliveredOrders) {
      const days = (new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      totalDays += Math.min(days, 30);
    }
    return totalDays / deliveredOrders.length;
  }

  private getTopCustomers(orders: Order[], limit: number): any[] {
    const customers: any = {};
    for (const order of orders) {
      if (!order.user) continue;
      const key = order.user.id;
      if (!customers[key]) {
        customers[key] = {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email,
          orders: 0,
          totalSpent: 0,
        };
      }
      customers[key].orders += 1;
      customers[key].totalSpent += Number(order.total);
    }
    return Object.values(customers)
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }
}