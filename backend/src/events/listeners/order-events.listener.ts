// src/events/listeners/order-events.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventType, OrderEvent } from '../events.types';
import { NotificationService } from '../../notifications/notification.service';
import { NotificationType, NotificationChannel } from '../../notifications/notification.entity';
import { MailerService } from '../../mailer/mailer.service';
import { UserService } from '../../user/user.service';
import { EventsGateway } from '../events.gateway';
import { MetricsService } from '../../monitoring/metrics.service';

@Injectable()
export class OrderEventsListener {
  private readonly logger = new Logger(OrderEventsListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly mailerService: MailerService,
    private readonly userService: UserService,
    private readonly eventsGateway: EventsGateway,
    private readonly metricsService: MetricsService,
  ) {}

  @OnEvent(EventType.ORDER_CREATED)
  async handleOrderCreated(event: OrderEvent): Promise<void> {
    this.logger.debug(`Handling ORDER_CREATED event for order ${event.orderId}`);

    try {
      const user = await this.userService.findByIdOrFail(event.userId);

      await this.mailerService.sendOrderConfirmation(user.email, {
        id: event.orderId,
        total: event.data?.total,
        items: event.data?.items,
      });

      // ✅ FIX: Use correct NotificationType enum
      await this.notificationService.create(
        event.userId,
        NotificationType.ORDER_CONFIRMATION,
        NotificationChannel.IN_APP,
        `Order #${event.orderId} confirmed`,
        `Your order #${event.orderId} has been confirmed. Total: $${event.data?.total || 0}`,
        { orderId: event.orderId },
      );

      this.eventsGateway.notifyUser(
        event.userId.toString(),
        'order_created',
        { orderId: event.orderId },
      );

      this.metricsService.recordEmailSent('order_confirmation', 'success');
    } catch (error: unknown) {
      // ✅ FIX: Proper error handling for unknown type
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to handle ORDER_CREATED event: ${errorMessage}`);
      this.metricsService.recordEmailSent('order_confirmation', 'failed');
    }
  }

  @OnEvent(EventType.ORDER_STATUS_UPDATED)
  async handleOrderStatusUpdated(event: OrderEvent): Promise<void> {
    this.logger.debug(
      `Handling ORDER_STATUS_UPDATED event for order ${event.orderId}`,
    );

    try {
      const user = await this.userService.findByIdOrFail(event.userId);

      await this.mailerService.sendOrderStatusUpdate(
        user.email,
        { id: event.orderId },
        event.status || 'updated',
      );

      // ✅ FIX: Use correct NotificationType enum
      await this.notificationService.create(
        event.userId,
        NotificationType.ORDER_STATUS_UPDATED,
        NotificationChannel.IN_APP,
        `Order #${event.orderId} status updated`,
        `Your order #${event.orderId} is now ${event.status}`,
        { orderId: event.orderId, status: event.status },
      );

      this.eventsGateway.notifyUser(
        event.userId.toString(),
        'order_status_updated',
        { orderId: event.orderId, status: event.status },
      );
    } catch (error: unknown) {
      // ✅ FIX: Proper error handling for unknown type
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to handle ORDER_STATUS_UPDATED event: ${errorMessage}`);
    }
  }

  @OnEvent(EventType.ORDER_CANCELLED)
  async handleOrderCancelled(event: OrderEvent): Promise<void> {
    this.logger.debug(`Handling ORDER_CANCELLED event for order ${event.orderId}`);

    try {
      const user = await this.userService.findByIdOrFail(event.userId);

      // ✅ FIX: Use correct NotificationType enum
      await this.notificationService.create(
        event.userId,
        NotificationType.ORDER_CANCELLED,
        NotificationChannel.IN_APP,
        `Order #${event.orderId} cancelled`,
        `Your order #${event.orderId} has been cancelled`,
        { orderId: event.orderId },
      );

      this.eventsGateway.notifyUser(
        event.userId.toString(),
        'order_cancelled',
        { orderId: event.orderId },
      );
    } catch (error: unknown) {
      // ✅ FIX: Proper error handling for unknown type
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to handle ORDER_CANCELLED event: ${errorMessage}`);
    }
  }
}