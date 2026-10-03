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
import { OrderTimeline } from './order-timeline.entity';
import { Product } from '../products/products.entity';
import { User, UserRole } from '../user/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { MailerService } from '../mailer/mailer.service';
import { EventsGateway } from '../events/events.gateway';
import { IdempotencyService } from './idempotency.service';
import { PaginationDto } from '../common/dto/pagination.dto';

import { VendorOrder, VendorOrderStatus, VendorPayoutStatus } from './vendor-order.entity';
import { UpdateVendorOrderDto } from './dto/update-vendor-order.dto';
import { VendorWallet } from '../vendor/vendor-wallet.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(VendorOrder)
    private readonly vendorOrderRepository: Repository<VendorOrder>,
    @InjectRepository(VendorWallet)
    private readonly vendorWalletRepository: Repository<VendorWallet>,
    @InjectRepository(OrderTimeline)
    private readonly timelineRepository: Repository<OrderTimeline>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly mailerService: MailerService,
    private readonly eventsGateway: EventsGateway,
    private readonly idempotencyService: IdempotencyService,
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
      const vendorGroups = new Map<
        number,
        {
          vendor: User;
          items: { product: Product; quantity: number; price: number }[];
          subtotal: number;
        }
      >();

      for (const item of createOrderDto.items) {
        // Concurrency-safe pessimistic write lock on the product row
        const product = await queryRunner.manager
          .createQueryBuilder(Product, 'product')
          .setLock('pessimistic_write')
          .where('product.id = :id AND product.isActive = true', {
            id: item.productId,
          })
          .getOne();

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

        // Determine vendor (defaults to product.ownerId, or fallback platform admin ID 1)
        const vendorId = product.ownerId || 1;
        const vendorUser = { id: vendorId } as User;

        if (!vendorGroups.has(vendorId)) {
          vendorGroups.set(vendorId, {
            vendor: vendorUser,
            items: [],
            subtotal: 0,
          });
        }

        const group = vendorGroups.get(vendorId)!;
        group.items.push({
          product,
          quantity: item.quantity,
          price: Number(product.price),
        });
        group.subtotal += itemTotal;

        product.stock -= item.quantity;
        await queryRunner.manager.save(product);
      }

      const order = new Order();
      order.user = user;
      order.total = total;
      order.status = OrderStatus.PENDING;
      if (createOrderDto.shippingAddress) {
        order.shippingAddress = createOrderDto.shippingAddress;
      }

      const savedOrder = await queryRunner.manager.save(order);
      const commissionRate = 10; // Standard 10% platform commission

      // Create individual Vendor Sub-Orders (packages) per vendor
      for (const [vendorId, group] of vendorGroups.entries()) {
        const vendorSubtotal = Math.round(group.subtotal * 100) / 100;
        const commissionAmount =
          Math.round(vendorSubtotal * (commissionRate / 100) * 100) / 100;
        const vendorEarnings =
          Math.round((vendorSubtotal - commissionAmount) * 100) / 100;

        const vendorOrder = new VendorOrder();
        vendorOrder.order = savedOrder;
        vendorOrder.orderId = savedOrder.id;
        vendorOrder.vendorId = vendorId;
        vendorOrder.vendor = group.vendor;
        vendorOrder.status = VendorOrderStatus.PENDING;
        vendorOrder.subtotal = vendorSubtotal;
        vendorOrder.shippingFee = 0;
        vendorOrder.commissionRate = commissionRate;
        vendorOrder.commissionAmount = commissionAmount;
        vendorOrder.vendorEarnings = vendorEarnings;
        vendorOrder.payoutStatus = VendorPayoutStatus.ESCROW;

        const savedVendorOrder = await queryRunner.manager.save(
          VendorOrder,
          vendorOrder,
        );

        for (const it of group.items) {
          const orderItem = new OrderItem();
          orderItem.order = savedOrder;
          orderItem.vendorOrder = savedVendorOrder;
          orderItem.vendorOrderId = savedVendorOrder.id;
          orderItem.product = it.product;
          orderItem.quantity = it.quantity;
          orderItem.price = it.price;

          await queryRunner.manager.save(OrderItem, orderItem);
        }

        // Update or create vendor wallet escrow balance
        let wallet = await queryRunner.manager.findOne(VendorWallet, {
          where: { vendorId },
        });
        if (!wallet) {
          wallet = queryRunner.manager.create(VendorWallet, {
            vendorId,
            availableBalance: 0,
            escrowBalance: vendorEarnings,
            totalEarned: 0,
            totalWithdrawn: 0,
          });
        } else {
          wallet.escrowBalance = Number(wallet.escrowBalance) + vendorEarnings;
        }
        await queryRunner.manager.save(VendorWallet, wallet);

        // Notify vendor via real-time event
        this.eventsGateway.notifyUser(vendorId.toString(), 'new_vendor_order', {
          orderId: savedOrder.id,
          vendorOrderId: savedVendorOrder.id,
          subtotal: vendorSubtotal,
          itemCount: group.items.length,
        });
      }

      const timeline = new OrderTimeline();
      timeline.order = savedOrder;
      timeline.orderId = savedOrder.id;
      timeline.user = user;
      timeline.action = 'Order Placed';
      timeline.metadata = {
        total: savedOrder.total,
        packagesCount: vendorGroups.size,
        shippingAddress: savedOrder.shippingAddress,
      };
      await queryRunner.manager.save(timeline);

      await queryRunner.commitTransaction();

      const completeOrder = await this.findOne(savedOrder.id);

      this.fireAndForget(
        this.mailerService.sendOrderConfirmation(user.email, completeOrder),
        `order confirmation to ${user.email}`,
      );

      this.eventsGateway.notifyUser(userId.toString(), 'order_created', {
        orderId: completeOrder.id,
        total: completeOrder.total,
      });

      this.logger.log(`Order created: ${savedOrder.id} by user ${userId}`);
      return completeOrder;
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
    return this.idempotencyService.process(idempotencyKey, userId, async () => {
      return this.create(userId, createOrderDto);
    });
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.orderRepository.findAndCount({
      relations: ['user', 'items', 'items.product'],
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

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['user', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'user',
        'items',
        'items.product',
        'items.product.owner',
        'vendorOrders',
        'vendorOrders.vendor',
        'vendorOrders.items',
        'vendorOrders.items.product',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findByUser(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { user: { id: userId } },
      relations: [
        'items',
        'items.product',
        'vendorOrders',
        'vendorOrders.vendor',
        'vendorOrders.items',
        'vendorOrders.items.product',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findByVendor(vendorId: number): Promise<Order[]> {
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.owner', 'owner')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.vendorOrders', 'vendorOrders')
      .where('owner.id = :vendorId', { vendorId })
      .orderBy('order.createdAt', 'DESC')
      .getMany();

    return orders.map((order) => ({
      ...order,
      items: order.items.filter((item) => item.product.owner?.id === vendorId),
    }));
  }

  async getVendorSubOrders(
    vendorId: number,
    options?: { page?: number; limit?: number; status?: VendorOrderStatus },
  ): Promise<{
    data: VendorOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.vendorOrderRepository
      .createQueryBuilder('vo')
      .leftJoinAndSelect('vo.order', 'order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('vo.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('vo.vendorId = :vendorId', { vendorId });

    if (options?.status) {
      query.andWhere('vo.status = :status', { status: options.status });
    }

    query.orderBy('vo.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getVendorSubOrderDetail(
    vendorOrderId: number,
    userId: number,
    userRole: UserRole,
  ): Promise<VendorOrder> {
    const vo = await this.vendorOrderRepository.findOne({
      where: { id: vendorOrderId },
      relations: [
        'order',
        'order.user',
        'vendor',
        'items',
        'items.product',
      ],
    });

    if (!vo) {
      throw new NotFoundException(`Vendor sub-order ${vendorOrderId} not found`);
    }

    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
    if (!isAdmin && vo.vendorId !== userId) {
      throw new ForbiddenException('Access denied to this vendor sub-order');
    }

    return vo;
  }

  async updateVendorSubOrderStatus(
    vendorOrderId: number,
    vendorId: number,
    userRole: UserRole,
    dto: UpdateVendorOrderDto,
  ): Promise<VendorOrder> {
    const vo = await this.vendorOrderRepository.findOne({
      where: { id: vendorOrderId },
      relations: ['order', 'order.user', 'vendor'],
    });

    if (!vo) {
      throw new NotFoundException(`Vendor sub-order ${vendorOrderId} not found`);
    }

    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
    if (!isAdmin && vo.vendorId !== vendorId) {
      throw new ForbiddenException("You cannot update another seller's sub-order");
    }

    vo.status = dto.status;
    if (dto.carrierName) vo.carrierName = dto.carrierName;
    if (dto.trackingNumber) vo.trackingNumber = dto.trackingNumber;
    if (dto.trackingUrl) vo.trackingUrl = dto.trackingUrl;
    if (dto.notes) vo.notes = dto.notes;

    if (dto.status === VendorOrderStatus.SHIPPED) {
      vo.shippedAt = new Date();
    } else if (dto.status === VendorOrderStatus.DELIVERED) {
      vo.deliveredAt = new Date();

      // Release funds from Escrow into Vendor Available Balance
      if (vo.payoutStatus === VendorPayoutStatus.ESCROW) {
        vo.payoutStatus = VendorPayoutStatus.READY;

        let wallet = await this.vendorWalletRepository.findOne({
          where: { vendorId: vo.vendorId },
        });
        if (wallet) {
          wallet.escrowBalance = Math.max(
            0,
            Number(wallet.escrowBalance) - Number(vo.vendorEarnings),
          );
          wallet.availableBalance =
            Number(wallet.availableBalance) + Number(vo.vendorEarnings);
          wallet.totalEarned =
            Number(wallet.totalEarned) + Number(vo.vendorEarnings);
          await this.vendorWalletRepository.save(wallet);
        }
      }
    }

    const savedVo = await this.vendorOrderRepository.save(vo);

    // Sync parent order status based on all child vendor orders
    const allSiblingSubOrders = await this.vendorOrderRepository.find({
      where: { orderId: vo.orderId },
    });

    const allDelivered = allSiblingSubOrders.every(
      (s) => s.status === VendorOrderStatus.DELIVERED,
    );
    const anyShipped = allSiblingSubOrders.some(
      (s) =>
        s.status === VendorOrderStatus.SHIPPED ||
        s.status === VendorOrderStatus.DELIVERED,
    );
    const allCancelled = allSiblingSubOrders.every(
      (s) => s.status === VendorOrderStatus.CANCELLED,
    );

    let newParentStatus = vo.order.status;
    if (allDelivered) {
      newParentStatus = OrderStatus.DELIVERED;
    } else if (allCancelled) {
      newParentStatus = OrderStatus.CANCELLED;
    } else if (anyShipped) {
      const allShippedOrDelivered = allSiblingSubOrders.every(
        (s) =>
          s.status === VendorOrderStatus.SHIPPED ||
          s.status === VendorOrderStatus.DELIVERED,
      );
      newParentStatus = allShippedOrDelivered
        ? OrderStatus.SHIPPED
        : OrderStatus.PARTIALLY_SHIPPED;
    } else if (
      allSiblingSubOrders.some((s) => s.status === VendorOrderStatus.PROCESSING)
    ) {
      newParentStatus = OrderStatus.PROCESSING;
    }

    if (newParentStatus !== vo.order.status) {
      vo.order.status = newParentStatus;
      await this.orderRepository.save(vo.order);
    }

    // Record timeline entry
    const timeline = this.timelineRepository.create({
      order: vo.order,
      orderId: vo.order.id,
      user: { id: vendorId } as User,
      action: `Package #${vo.id} status updated to ${dto.status}`,
      metadata: {
        vendorOrderId: vo.id,
        status: dto.status,
        carrierName: dto.carrierName,
        trackingNumber: dto.trackingNumber,
      },
    });
    await this.timelineRepository.save(timeline);

    // Real-time notification to the customer
    if (vo.order?.user?.id) {
      this.eventsGateway.notifyUser(
        vo.order.user.id.toString(),
        'vendor_order_status_updated',
        {
          orderId: vo.order.id,
          vendorOrderId: vo.id,
          status: dto.status,
          carrierName: dto.carrierName,
          trackingNumber: dto.trackingNumber,
        },
      );
    }

    return savedVo;
  }

  async updateStatus(
    id: number,
    status: OrderStatus,
    userId: number,
  ): Promise<Order> {
    const order = await this.findOne(id);

    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }

    order.status = status;
    const updatedOrder = await this.orderRepository.save(order);

    const timeline = this.timelineRepository.create({
      order: updatedOrder,
      orderId: updatedOrder.id,
      user: { id: userId } as User,
      action: `Status updated to ${status}`,
      metadata: { status },
    });
    await this.timelineRepository.save(timeline);

    this.logger.log(
      `Order ${id} status updated to ${status} by user ${userId}`,
    );

    this.fireAndForget(
      this.mailerService.sendOrderStatusUpdate(order.user.email, order, status),
      `status update to ${order.user.email}`,
    );

    this.eventsGateway.notifyUser(
      order.user.id.toString(),
      'order_status_updated',
      { orderId: order.id, status },
    );

    return updatedOrder;
  }

  async cancelOrder(
    id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<Order> {
    const order = await this.findOne(id);

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
      order.cancelledAt = new Date();
      order.cancelledBy = { id: userId } as User;
      const cancelledOrder = await queryRunner.manager.save(order);

      // Cancel all child vendor orders and reverse escrow balances
      const subOrders = await queryRunner.manager.find(VendorOrder, {
        where: { orderId: order.id },
      });
      for (const so of subOrders) {
        if (so.payoutStatus === VendorPayoutStatus.ESCROW) {
          so.payoutStatus = VendorPayoutStatus.REFUNDED;
          let wallet = await queryRunner.manager.findOne(VendorWallet, {
            where: { vendorId: so.vendorId },
          });
          if (wallet) {
            wallet.escrowBalance = Math.max(
              0,
              Number(wallet.escrowBalance) - Number(so.vendorEarnings),
            );
            await queryRunner.manager.save(VendorWallet, wallet);
          }
        }
        so.status = VendorOrderStatus.CANCELLED;
        so.cancelledAt = new Date();
        so.cancellationReason = 'Order cancelled by customer/admin';
        await queryRunner.manager.save(VendorOrder, so);
      }

      const timeline = new OrderTimeline();
      timeline.order = cancelledOrder;
      timeline.orderId = cancelledOrder.id;
      timeline.user = { id: userId } as User;
      timeline.action = 'Order Cancelled';
      timeline.metadata = { cancelledByUserId: userId, userRole };
      await queryRunner.manager.save(timeline);

      await queryRunner.commitTransaction();

      this.logger.log(`Order ${id} cancelled successfully by user ${userId}`);

      this.eventsGateway.notifyUser(
        order.user.id.toString(),
        'order_cancelled',
        { orderId: order.id },
      );

      return cancelledOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrderTimeline(
    orderId: number,
    userId: number,
    userRole: UserRole,
  ): Promise<OrderTimeline[]> {
    const order = await this.findOne(orderId);

    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
    const isOwner = order.user?.id === userId;
    let isVendorWithProducts = false;
    if (userRole === UserRole.VENDOR) {
      isVendorWithProducts = order.items.some(
        (item) => item.product.owner?.id === userId,
      );
    }

    if (!isAdmin && !isOwner && !isVendorWithProducts) {
      throw new ForbiddenException(
        'You do not have permission to view this order timeline',
      );
    }

    return this.timelineRepository.find({
      where: { orderId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

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

    const pendingOrders = orders.filter(
      (o) => o.status === OrderStatus.PENDING,
    ).length;
    const processingOrders = orders.filter(
      (o) => o.status === OrderStatus.PROCESSING,
    ).length;
    const shippedOrders = orders.filter(
      (o) => o.status === OrderStatus.SHIPPED,
    ).length;
    const deliveredOrders = orders.filter(
      (o) => o.status === OrderStatus.DELIVERED,
    ).length;
    const cancelledOrders = orders.filter(
      (o) => o.status === OrderStatus.CANCELLED,
    ).length;

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

    const pendingOrders = orders.filter(
      (o) => o.status === OrderStatus.PENDING,
    ).length;
    const processingOrders = orders.filter(
      (o) => o.status === OrderStatus.PROCESSING,
    ).length;
    const shippedOrders = orders.filter(
      (o) => o.status === OrderStatus.SHIPPED,
    ).length;
    const deliveredOrders = orders.filter(
      (o) => o.status === OrderStatus.DELIVERED,
    ).length;
    const cancelledOrders = orders.filter(
      (o) => o.status === OrderStatus.CANCELLED,
    ).length;

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

  private fireAndForget(promise: Promise<unknown>, label: string) {
    promise.catch((err) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to send ${label}`, msg);
    });
  }
}
