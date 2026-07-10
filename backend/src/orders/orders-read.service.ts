// src/orders/orders-read.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { CacheService } from '../common/cache/cache.service';
import { AnalyticsUtils } from '../common/utils/analytics.utils';

@Injectable()
export class OrdersReadService {
  private readonly CACHE_TTL = 300;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly cacheService: CacheService,
  ) {}

  async getOrderSummary(userId: number, period: string = 'month'): Promise<any> {
    const cacheKey = `order:summary:${userId}:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const orders = await this.orderRepository.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
    });

    const result = {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, o) => sum + Number(o.total), 0),
      pendingOrders: orders.filter((o) => o.status === 'pending').length,
      recentOrders: orders.slice(0, 5),
      analytics: {
        statusDistribution: AnalyticsUtils.getStatusDistribution(orders),
        dailyTrend: AnalyticsUtils.groupByDay(orders.slice(0, 30)),
      },
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  // ... other read-only methods
}