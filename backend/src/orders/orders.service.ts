import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/products.entity';
import { User } from '../user/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly mailerService: MailerService,
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

      let total = 0;
      const orderItems: OrderItem[] = [];

      for (const item of createOrderDto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product "${product.title}". Available: ${product.stock}`,
          );
        }

        const itemTotal = product.price * item.quantity;
        total += itemTotal;

        const orderItem = new OrderItem();
        orderItem.product = product;
        orderItem.quantity = item.quantity;
        orderItem.price = product.price;

        orderItems.push(orderItem);

        // Reduce stock
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

      const completeOrder = await this.findOne(savedOrder.id);

      // Send order confirmation email
      try {
        await this.mailerService.sendOrderConfirmation(user.email, completeOrder);
        this.logger.log(`Order confirmation sent to ${user.email}`);
      } catch (error) {
        const trace = error instanceof Error ? error.stack : String(error);
        this.logger.error('Failed to send order confirmation', trace);
      }

      this.logger.log(`Order created: ${savedOrder.id} by user ${userId}`);
      return completeOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findByUser(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);

    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }

    order.status = status;
    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(`Order ${id} status updated to ${status}`);

    // Send status update email
    try {
      await this.mailerService.sendOrderStatusUpdate(
        order.user.email,
        order,
        status,
      );
    } catch (error) {
      const trace = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to send status update email', trace);
    }

    return updatedOrder;
  }

  async cancelOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.SHIPPED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    // Restore stock
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of order.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.product.id },
        });

        if (product) {
          product.stock += item.quantity;
          await queryRunner.manager.save(product);
        }
      }

      order.status = OrderStatus.CANCELLED;
      const cancelledOrder = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      this.logger.log(`Order ${id} cancelled successfully`);
      return cancelledOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrderSummary(userId: number): Promise<any> {
    const orders = await this.findByUser(userId);

    const totalOrders = orders.length;
    const totalSpent = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);

    const pendingOrders = orders.filter(
      (o) => o.status === OrderStatus.PENDING,
    ).length;

    return {
      totalOrders,
      totalSpent,
      pendingOrders,
      recentOrders: orders.slice(0, 5),
    };
  }
}