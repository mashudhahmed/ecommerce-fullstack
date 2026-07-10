// src/analytics/analytics.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Between, MoreThan } from 'typeorm';
import { Order, OrderStatus } from '../orders/order.entity';
import { User } from '../user/user.entity';
import { Product } from '../products/products.entity';
import { OrderItem } from '../orders/order-item.entity';
import { AnalyticsUtils } from '../common/utils/analytics.utils';
import { CacheService } from '../common/cache/cache.service';
import { MetricsService } from '../monitoring/metrics.service';
import { Trace } from '../common/decorators/tracing.decorator';
import { QueryTimeout } from '../common/decorators/query-timeout.decorator';

export interface SalesOverview {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  dailyData: {
    date: string;
    total: number;
    count: number;
  }[];
  orderStatusDistribution: Record<string, number>;
}

export interface ProductPerformanceResult {
  id: number;
  title: string;
  totalSold: number;
  totalRevenue: number;
  totalOrders: number;
}

export interface UserAnalyticsResult {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  orders: number;
  conversionRate: number;
}

export interface VendorAnalyticsResult {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface ReportData {
  reportPeriod: {
    start: Date;
    end: Date;
  };
  sales: SalesOverview;
  products: {
    bestSellers: ProductPerformanceResult[];
    topRevenue: ProductPerformanceResult[];
    lowPerformance: ProductPerformanceResult[];
  };
  users: UserAnalyticsResult;
  generatedAt: Date;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly CACHE_TTL = 600;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
  ) {}

  @Trace('analytics.getSalesOverview')
  @QueryTimeout(30000)
  async getSalesOverview(startDate: Date, endDate: Date): Promise<SalesOverview> {
    const cacheKey = `analytics:sales:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    const cached = await this.cacheService.get<SalesOverview>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for sales overview');
      this.metricsService.recordCacheHit('analytics:sales');
      return cached;
    }
    
    this.metricsService.recordCacheMiss('analytics:sales');
    this.logger.debug(`Getting sales overview for ${startDate} to ${endDate}`);
    
    const startTime = Date.now();

    const orders = await this.orderRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: MoreThan(OrderStatus.CANCELLED),
      },
      relations: ['items', 'items.product'],
    });

    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const dailyData = AnalyticsUtils.groupByDay(orders);
    const distribution = AnalyticsUtils.getStatusDistribution(orders);
    const orderStatusDistribution: Record<string, number> = {};
    for (const d of distribution) {
      orderStatusDistribution[d.status] = d.count;
    }

    const result: SalesOverview = {
      totalSales,
      totalOrders,
      averageOrderValue,
      dailyData: dailyData.map(d => ({
        date: d.date,
        total: d.revenue,
        count: d.orders,
      })),
      orderStatusDistribution,
    };

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('find', 'orders', duration);
    this.logger.debug(`Sales overview retrieved in ${duration}s`);

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Trace('analytics.getProductPerformance')
  @QueryTimeout(30000)
  async getProductPerformance(startDate: Date, endDate: Date): Promise<{
    bestSellers: ProductPerformanceResult[];
    topRevenue: ProductPerformanceResult[];
    lowPerformance: ProductPerformanceResult[];
  }> {
    const cacheKey = `analytics:products:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    const cached = await this.cacheService.get<{
      bestSellers: ProductPerformanceResult[];
      topRevenue: ProductPerformanceResult[];
      lowPerformance: ProductPerformanceResult[];
    }>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for product performance');
      this.metricsService.recordCacheHit('analytics:products');
      return cached;
    }
    
    this.metricsService.recordCacheMiss('analytics:products');
    this.logger.debug(`Getting product performance for ${startDate} to ${endDate}`);
    
    const startTime = Date.now();

    const results = await this.dataSource
      .createQueryBuilder()
      .select([
        'product.id as id',
        'product.title as title',
        'SUM(orderItem.quantity) as totalSold',
        'SUM(orderItem.quantity * orderItem.price) as totalRevenue',
        'COUNT(DISTINCT "order".id) as totalOrders',
      ])
      .from(OrderItem, 'orderItem')
      .leftJoin('orderItem.product', 'product')
      .leftJoin('orderItem.order', 'order')
      .where('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .groupBy('product.id, product.title')
      .getRawMany();

    const parsedResults: ProductPerformanceResult[] = results.map((r: any) => ({
      id: Number(r.id),
      title: r.title,
      totalSold: Number(r.totalSold || 0),
      totalRevenue: Number(r.totalRevenue || 0),
      totalOrders: Number(r.totalOrders || 0),
    }));

    const result = {
      bestSellers: parsedResults.sort((a, b) => b.totalSold - a.totalSold).slice(0, 10),
      topRevenue: parsedResults.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10),
      lowPerformance: parsedResults.sort((a, b) => a.totalSold - b.totalSold).slice(0, 10),
    };

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('aggregate', 'order_items', duration);
    this.logger.debug(`Product performance retrieved in ${duration}s`);

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Trace('analytics.getUserAnalytics')
  @QueryTimeout(15000)
  async getUserAnalytics(startDate: Date, endDate: Date): Promise<UserAnalyticsResult> {
    const cacheKey = `analytics:users:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    const cached = await this.cacheService.get<UserAnalyticsResult>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for user analytics');
      return cached;
    }
    
    this.logger.debug(`Getting user analytics for ${startDate} to ${endDate}`);
    
    const startTime = Date.now();

    const [totalUsers, newUsers, orders, activeUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({
        where: { createdAt: Between(startDate, endDate) },
      }),
      this.orderRepository.count({
        where: {
          createdAt: Between(startDate, endDate),
          status: MoreThan(OrderStatus.CANCELLED),
        },
      }),
      this.orderRepository
        .createQueryBuilder('order')
        .select('order.userId')
        .where('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
        .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
        .groupBy('order.userId')
        .getRawMany(),
    ]);

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('count', 'users', duration);
    this.logger.debug(`User analytics retrieved in ${duration}s`);

    const result: UserAnalyticsResult = {
      totalUsers,
      newUsers,
      activeUsers: activeUsers.length,
      orders,
      conversionRate: totalUsers > 0 ? (activeUsers.length / totalUsers) * 100 : 0,
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Trace('analytics.getVendorAnalytics')
  @QueryTimeout(20000)
  async getVendorAnalytics(
    vendorId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<VendorAnalyticsResult> {
    const cacheKey = `analytics:vendor:${vendorId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    const cached = await this.cacheService.get<VendorAnalyticsResult>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for vendor analytics ${vendorId}`);
      return cached;
    }
    
    this.logger.debug(`Getting vendor analytics for vendor ${vendorId}`);
    
    const startTime = Date.now();

    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        'COALESCE(SUM("order".total), 0) as totalRevenue',
        'COUNT(DISTINCT "order".id) as totalOrders',
      ])
      .from(Product, 'product')
      .leftJoin('product.orderItems', 'orderItem')
      .leftJoin('orderItem.order', 'order')
      .where('product.ownerId = :vendorId', { vendorId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne();

    const totalRevenue = Number(result?.totalRevenue || 0);
    const totalOrders = Number(result?.totalOrders || 0);

    const response: VendorAnalyticsResult = {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };

    const duration = (Date.now() - startTime) / 1000;
    this.metricsService.recordDbQuery('aggregate', 'orders', duration);
    this.logger.debug(`Vendor analytics retrieved in ${duration}s`);

    await this.cacheService.set(cacheKey, response, this.CACHE_TTL);
    return response;
  }

  @Trace('analytics.exportReport')
  @QueryTimeout(60000)
  async exportReport(startDate: Date, endDate: Date): Promise<ReportData> {
    this.logger.log(`Generating report for ${startDate} to ${endDate}`);
    
    const startTime = Date.now();

    const [sales, products, users] = await Promise.all([
      this.getSalesOverview(startDate, endDate),
      this.getProductPerformance(startDate, endDate),
      this.getUserAnalytics(startDate, endDate),
    ]);

    const report: ReportData = {
      reportPeriod: {
        start: startDate,
        end: endDate,
      },
      sales,
      products,
      users,
      generatedAt: new Date(),
    };

    const duration = (Date.now() - startTime) / 1000;
    this.logger.log(`Report generated in ${duration}s`);
    this.metricsService.recordDbQuery('report', 'analytics', duration);

    return report;
  }

  @Trace('analytics.getDailySalesTrend')
  @QueryTimeout(10000)
  async getDailySalesTrend(days: number = 30): Promise<{
    dates: string[];
    revenue: number[];
    orders: number[];
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cacheKey = `analytics:daily:${days}`;
    const cached = await this.cacheService.get<{
      dates: string[];
      revenue: number[];
      orders: number[];
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const orders = await this.orderRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: MoreThan(OrderStatus.CANCELLED),
      },
    });

    const dailyData = AnalyticsUtils.groupByDay(orders);
    
    const dateMap = new Map<string, { revenue: number; orders: number }>();
    for (const d of dailyData) {
      dateMap.set(d.date, { revenue: d.revenue, orders: d.orders });
    }

    const result = {
      dates: [] as string[],
      revenue: [] as number[],
      orders: [] as number[],
    };

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const data = dateMap.get(dateStr) || { revenue: 0, orders: 0 };
      result.dates.push(dateStr);
      result.revenue.push(data.revenue);
      result.orders.push(data.orders);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  @Trace('analytics.getCategoryPerformance')
  @QueryTimeout(20000)
  async getCategoryPerformance(startDate: Date, endDate: Date): Promise<{
    categoryId: number;
    categoryName: string;
    totalRevenue: number;
    totalOrders: number;
    productCount: number;
  }[]> {
    const cacheKey = `analytics:categories:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    const cached = await this.cacheService.get<{
      categoryId: number;
      categoryName: string;
      totalRevenue: number;
      totalOrders: number;
      productCount: number;
    }[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.dataSource
      .createQueryBuilder()
      .select([
        'category.id as categoryId',
        'category.name as categoryName',
        'COALESCE(SUM(orderItem.quantity * orderItem.price), 0) as totalRevenue',
        'COUNT(DISTINCT "order".id) as totalOrders',
        'COUNT(DISTINCT product.id) as productCount',
      ])
      .from(Product, 'product')
      .leftJoin('product.category', 'category')
      .leftJoin('product.orderItems', 'orderItem')
      .leftJoin('orderItem.order', 'order')
      .where('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy('category.id, category.name')
      .getRawMany();

    const result = results.map((r: any) => ({
      categoryId: Number(r.categoryId),
      categoryName: r.categoryName || 'Uncategorized',
      totalRevenue: Number(r.totalRevenue || 0),
      totalOrders: Number(r.totalOrders || 0),
      productCount: Number(r.productCount || 0),
    }));

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  @Trace('analytics.invalidateCache')
  async invalidateCache(): Promise<void> {
    this.logger.log('Invalidating analytics cache');
    await this.cacheService.invalidatePattern('analytics:*');
  }
}