// src/analytics/analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Order, OrderStatus } from '../orders/order.entity';
import { User } from '../user/user.entity';
import { Product } from '../products/products.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getSalesOverview(startDate: Date, endDate: Date): Promise<any> {
    const orders = await this.orderRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: MoreThan(OrderStatus.CANCELLED),
      },
      relations: ['items'],
    });

    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Daily breakdown
    const dailyData = this.groupByDay(orders);

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      dailyData,
      orderStatusDistribution: this.getOrderStatusDistribution(orders),
    };
  }

  async getProductPerformance(startDate: Date, endDate: Date): Promise<any> {
    const orders = await this.orderRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: MoreThan(OrderStatus.CANCELLED),
      },
      relations: ['items', 'items.product'],
    });

    const productStats: any = {};

    for (const order of orders) {
      for (const item of order.items) {
        const key = item.product.id;
        if (!productStats[key]) {
          productStats[key] = {
            id: item.product.id,
            title: item.product.title,
            totalSold: 0,
            totalRevenue: 0,
            totalOrders: 0,
          };
        }
        productStats[key].totalSold += item.quantity;
        productStats[key].totalRevenue += Number(item.price) * item.quantity;
        productStats[key].totalOrders += 1;
      }
    }

    const products = Object.values(productStats);
    
    return {
      bestSellers: products.sort((a: any, b: any) => b.totalSold - a.totalSold).slice(0, 10),
      topRevenue: products.sort((a: any, b: any) => b.totalRevenue - a.totalRevenue).slice(0, 10),
      lowPerformance: products.sort((a: any, b: any) => a.totalSold - b.totalSold).slice(0, 10),
    };
  }

  async getUserAnalytics(startDate: Date, endDate: Date): Promise<any> {
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
        .groupBy('order.userId')
        .getRawMany(),
    ]);

    return {
      totalUsers,
      newUsers,
      activeUsers: activeUsers.length,
      orders,
      conversionRate: totalUsers > 0 ? (activeUsers.length / totalUsers) * 100 : 0,
    };
  }

  async getVendorAnalytics(vendorId: number, startDate: Date, endDate: Date): Promise<any> {
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('product.ownerId = :vendorId', { vendorId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getMany();

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      orderCount: orders.length,
    };
  }

  private groupByDay(orders: Order[]): any {
    const grouped: any = {};
    
    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { date, total: 0, count: 0 };
      }
      grouped[date].total += Number(order.total);
      grouped[date].count += 1;
    }

    return Object.values(grouped);
  }

  private getOrderStatusDistribution(orders: Order[]): any {
    const distribution: any = {};
    for (const order of orders) {
      const status = order.status;
      distribution[status] = (distribution[status] || 0) + 1;
    }
    return distribution;
  }

  async exportReport(startDate: Date, endDate: Date): Promise<any> {
    const [sales, products, users] = await Promise.all([
      this.getSalesOverview(startDate, endDate),
      this.getProductPerformance(startDate, endDate),
      this.getUserAnalytics(startDate, endDate),
    ]);

    return {
      reportPeriod: {
        start: startDate,
        end: endDate,
      },
      sales,
      products,
      users,
      generatedAt: new Date(),
    };
  }
}