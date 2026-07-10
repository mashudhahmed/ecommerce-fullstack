// src/orders/orders-write.service.ts
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/products.entity';
import { User } from '../user/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { MailerService } from '../mailer/mailer.service';
import { EventsGateway } from '../events/events.gateway';
import { IdempotencyService } from './idempotency.service';
import { CacheService } from '../common/cache/cache.service';
import { MetricsService } from '../monitoring/metrics.service';

@Injectable()
export class OrdersWriteService {
  private readonly logger = new Logger(OrdersWriteService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly mailerService: MailerService,
    private readonly eventsGateway: EventsGateway,
    private readonly idempotencyService: IdempotencyService,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
  ) {}

  async create(userId: number, createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.isVerified) {
        throw new BadRequestException('Please verify your email before placing orders');
      }

      let total = 0;
      const orderItems: OrderItem[] = [];

      for (const item of createOrderDto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId, isActive: true },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found or inactive`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product "${product.title}". Available: ${product.stock}`,
          );
        }

        const itemTotal = Number(product.price) * item.quantity;
        total += itemTotal;

        const orderItem = new OrderItem();
        orderItem.product = product;
        orderItem.quantity = item.quantity;
        orderItem.price = Number(product.price);

        orderItems.push(orderItem);

        product.stock -= item.quantity;
        await queryRunner.manager.save(product);
      }

      const order = new Order();
      order.user = user;
      order.total = total;
      order.status = OrderStatus.PENDING;

      const savedOrder = await queryRunner.manager.save(order);

      for (const item of orderItems) {
        item.order = savedOrder;
        await queryRunner.manager.save(item);
      }

      await queryRunner.commitTransaction();

      // Invalidate caches
      await this.cacheService.del(`orders:user:${userId}`);
      await this.cacheService.invalidatePattern('orders:list:*');

      // Record metrics
      this.metricsService.recordOrderCreated(order.status);
      this.metricsService.recordOrderRevenue(order.total);

      // Send confirmation email
      this.sendOrderConfirmation(user, savedOrder);

      this.logger.log(`Order created: ${savedOrder.id} by user ${userId}`);
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createWithIdempotency(
    userId: number,
    createOrderDto: CreateOrderDto,
    idempotencyKey: string,
  ): Promise<Order> {
    return this.idempotencyService.process(
      idempotencyKey,
      userId,
      async () => {
        return this.create(userId, createOrderDto);
      },
    );
  }

  private async sendOrderConfirmation(user: User, order: Order): Promise<void> {
    try {
      await this.mailerService.sendOrderConfirmation(user.email, order);
      this.metricsService.recordEmailSent('order_confirmation', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send order confirmation: ${errorMessage}`);
      this.metricsService.recordEmailSent('order_confirmation', 'failed');
    }
  }

  // ... other write methods (update, cancel, etc.)
}