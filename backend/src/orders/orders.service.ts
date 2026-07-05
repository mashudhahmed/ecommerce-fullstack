// src/orders/orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/products.entity';
import { User, UserRole } from '../user/user.entity';
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
    private readonly dataSource: DataSource,
    private readonly mailerService: MailerService,
  ) {}

  // ============================================================
  // CREATE ORDER
  // ============================================================
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
      this.fireAndForget(
        this.mailerService.sendOrderConfirmation(user.email, completeOrder),
        `order confirmation to ${user.email}`,
      );

      this.logger.log(`Order created: ${savedOrder.id} by user ${userId}`);
      return completeOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // FIND ALL (Admin/SuperAdmin)
  // ============================================================
  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================
  // FIND ONE
  // ============================================================
  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  // ============================================================
  // FIND BY USER
  // ============================================================
  async findByUser(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================
  // FIND BY VENDOR (Orders containing vendor's products)
  // ============================================================
  async findByVendor(vendorId: number): Promise<Order[]> {
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.owner', 'owner')
      .where('owner.id = :vendorId', { vendorId })
      .orderBy('order.createdAt', 'DESC')
      .getMany();

    // Filter orders to only show items from this vendor
    return orders.map((order) => ({
      ...order,
      items: order.items.filter((item) => item.product.owner?.id === vendorId),
    }));
  }

  // ============================================================
  // UPDATE STATUS (Admin/SuperAdmin)
  // ============================================================
  async updateStatus(id: number, status: OrderStatus, userId: number): Promise<Order> {
    const order = await this.findOne(id);

    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }

    order.status = status;
    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(`Order ${id} status updated to ${status} by user ${userId}`);

    // Send status update email
    this.fireAndForget(
      this.mailerService.sendOrderStatusUpdate(order.user.email, order, status),
      `status update to ${order.user.email}`,
    );

    return updatedOrder;
  }

  // ============================================================
  // CANCEL ORDER
  // ============================================================
  async cancelOrder(id: number, userId: number, userRole: UserRole): Promise<Order> {
    const order = await this.findOne(id);

    // Check if user owns the order or is admin/superadmin
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
    if (!isAdmin && order.user.id !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    if ([OrderStatus.DELIVERED, OrderStatus.SHIPPED].includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Restore stock
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

      this.logger.log(`Order ${id} cancelled successfully by user ${userId}`);
      return cancelledOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // GET ORDER SUMMARY FOR USER
  // ============================================================
  async getOrderSummary(userId: number): Promise<{
    totalOrders: number;
    totalSpent: number;
    pendingOrders: number;
    recentOrders: Order[];
  }> {
    const orders = await this.findByUser(userId);

    const totalOrders = orders.length;
    const totalSpent = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.total), 0);

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

  // ============================================================
  // GET VENDOR ORDER SUMMARY
  // ============================================================
  async getVendorOrderSummary(vendorId: number): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
  }> {
    const orders = await this.findByVendor(vendorId);

    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.total), 0);

    const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING).length;
    const processingOrders = orders.filter((o) => o.status === OrderStatus.PROCESSING).length;
    const shippedOrders = orders.filter((o) => o.status === OrderStatus.SHIPPED).length;
    const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED).length;
    const cancelledOrders = orders.filter((o) => o.status === OrderStatus.CANCELLED).length;

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
    };
  }

  // ============================================================
  // GET ADMIN STATS
  // ============================================================
  async getAdminStats(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
  }> {
    const orders = await this.findAll();

    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + Number(o.total), 0);

    const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING).length;
    const processingOrders = orders.filter((o) => o.status === OrderStatus.PROCESSING).length;
    const shippedOrders = orders.filter((o) => o.status === OrderStatus.SHIPPED).length;
    const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED).length;
    const cancelledOrders = orders.filter((o) => o.status === OrderStatus.CANCELLED).length;

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
    };
  }

  // ============================================================
  // HELPER: Fire and Forget
  // ============================================================
  private fireAndForget(promise: Promise<unknown>, label: string) {
    promise.catch((err) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`❌ Failed to send ${label}`, msg);
    });
  }
}