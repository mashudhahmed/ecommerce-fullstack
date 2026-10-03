import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Return, ReturnStatus } from './return.entity';
import { CreateReturnDto } from './dto/create-return.dto';
import { ProcessReturnDto } from './dto/process-return.dto';
import { Order } from '../orders/order.entity';
import { VendorOrder } from '../orders/vendor-order.entity';
import { VendorWallet } from '../vendor/vendor-wallet.entity';
import { Product } from '../products/products.entity';
import { NotificationService } from '../notifications/notification.service';
import {
  NotificationType,
  NotificationChannel,
} from '../notifications/notification.entity';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    @InjectRepository(Return)
    private readonly returnRepository: Repository<Return>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(VendorOrder)
    private readonly vendorOrderRepository: Repository<VendorOrder>,
    @InjectRepository(VendorWallet)
    private readonly vendorWalletRepository: Repository<VendorWallet>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly notificationService: NotificationService,
  ) {}

  async createReturn(userId: number, dto: CreateReturnDto): Promise<Return> {
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException(`Order #${dto.orderId} not found`);
    }

    if (order.user.id !== userId) {
      throw new ForbiddenException('You cannot request returns for another user’s order');
    }

    let vendorId: number | undefined;
    let vendorOrder: VendorOrder | null = null;

    if (dto.vendorOrderId) {
      vendorOrder = await this.vendorOrderRepository.findOne({
        where: { id: dto.vendorOrderId, orderId: dto.orderId },
      });
      if (!vendorOrder) {
        throw new NotFoundException(
          `Sub-order package #${dto.vendorOrderId} not found for this order`,
        );
      }
      vendorId = vendorOrder.vendorId;
    }

    // Calculate total refund amount
    const totalRefund = dto.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );

    const returnRecord = this.returnRepository.create({
      orderId: dto.orderId,
      userId,
      vendorOrderId: dto.vendorOrderId || null,
      vendorId: vendorId || null,
      reason: dto.reason,
      description: dto.description,
      images: dto.images || [],
      items: dto.items,
      refundAmount: Math.round(totalRefund * 100) / 100,
      status: ReturnStatus.PENDING,
    });

    const saved = await this.returnRepository.save(returnRecord);

    // Notify Vendor if assigned
    if (vendorId) {
      await this.notificationService
        .create(
          vendorId,
          NotificationType.ORDER_STATUS_UPDATED,
          NotificationChannel.IN_APP,
          'New Return Request',
          `Customer requested a return on package #${dto.vendorOrderId} ($${saved.refundAmount}). Reason: ${dto.reason}`,
        )
        .catch((e) => this.logger.warn(`Failed to notify vendor ${vendorId}: ${e.message}`));
    }

    return saved;
  }

  async getUserReturns(
    userId: number,
    page = 1,
    limit = 10,
  ): Promise<{ data: Return[]; total: number; page: number; totalPages: number }> {
    const [data, total] = await this.returnRepository.findAndCount({
      where: { userId },
      relations: ['order', 'vendorOrder', 'vendor'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getVendorReturns(
    vendorId: number,
    page = 1,
    limit = 10,
  ): Promise<{ data: Return[]; total: number; page: number; totalPages: number }> {
    const [data, total] = await this.returnRepository.findAndCount({
      where: { vendorId },
      relations: ['order', 'vendorOrder', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getAllReturns(
    page = 1,
    limit = 10,
  ): Promise<{ data: Return[]; total: number; page: number; totalPages: number }> {
    const [data, total] = await this.returnRepository.findAndCount({
      relations: ['order', 'vendorOrder', 'vendor', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async processReturn(
    actorId: number,
    returnId: number,
    dto: ProcessReturnDto,
    isAdmin = false,
  ): Promise<Return> {
    const returnRecord = await this.returnRepository.findOne({
      where: { id: returnId },
      relations: ['order', 'vendorOrder', 'vendor', 'user'],
    });

    if (!returnRecord) {
      throw new NotFoundException(`Return #${returnId} not found`);
    }

    if (!isAdmin && returnRecord.vendorId !== actorId) {
      throw new ForbiddenException('You can only manage returns for your own merchant packages');
    }

    if (
      returnRecord.status === ReturnStatus.REFUNDED ||
      returnRecord.status === ReturnStatus.APPROVED ||
      returnRecord.status === ReturnStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Return request has already been finalized with status ${returnRecord.status}`,
      );
    }

    if (dto.action === 'approve') {
      returnRecord.status = ReturnStatus.REFUNDED;
      returnRecord.approvedAt = new Date();
      returnRecord.refundedAt = new Date();
      returnRecord.adminNotes = dto.adminNotes || 'Approved and refunded';
      returnRecord.refundTransactionId = `REFUND-${Date.now()}`;

      // Restock returned items
      for (const item of returnRecord.items) {
        await this.productRepository
          .increment({ id: item.productId }, 'stock', item.quantity)
          .catch((e) => this.logger.warn(`Failed to restock product ${item.productId}: ${e.message}`));
      }

      // Adjust Vendor Wallet if applicable
      if (returnRecord.vendorId) {
        const wallet = await this.vendorWalletRepository.findOne({
          where: { vendorId: returnRecord.vendorId },
        });

        if (wallet) {
          // Compute net vendor earnings to deduct (subtotal minus 10% commission)
          const netDeduction =
            Math.round(Number(returnRecord.refundAmount) * 0.9 * 100) / 100;

          const currentAvail = Number(wallet.availableBalance);
          wallet.availableBalance = Math.max(0, currentAvail - netDeduction);
          wallet.totalEarned = Math.max(
            0,
            Number(wallet.totalEarned) - netDeduction,
          );
          await this.vendorWalletRepository.save(wallet);
        }
      }

      // Notify Buyer
      if (returnRecord.userId) {
        await this.notificationService
          .create(
            returnRecord.userId,
            NotificationType.ORDER_STATUS_UPDATED,
            NotificationChannel.IN_APP,
            'Return Approved & Refunded',
            `Your return request for order #${returnRecord.orderId} was approved! Refund of $${returnRecord.refundAmount} has been processed.`,
          )
          .catch((e) => this.logger.warn(`Failed to notify customer: ${e.message}`));
      }
    } else {
      returnRecord.status = ReturnStatus.REJECTED;
      returnRecord.rejectionReason =
        dto.rejectionReason || 'Return request does not meet seller return policy';
      returnRecord.adminNotes = dto.adminNotes;

      // Notify Buyer
      if (returnRecord.userId) {
        await this.notificationService
          .create(
            returnRecord.userId,
            NotificationType.ORDER_STATUS_UPDATED,
            NotificationChannel.IN_APP,
            'Return Request Declined',
            `Your return request for order #${returnRecord.orderId} was rejected. Reason: ${returnRecord.rejectionReason}`,
          )
          .catch((e) => this.logger.warn(`Failed to notify customer: ${e.message}`));
      }
    }

    return this.returnRepository.save(returnRecord);
  }
}
