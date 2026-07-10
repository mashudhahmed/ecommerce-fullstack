// src/events/events.service.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventType,
  OrderEvent,
  UserEvent,
  VendorEvent,
  ProductEvent,
  NotificationEvent,
} from './events.types';

@Injectable()
export class EventsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  // Order events
  emitOrderCreated(event: OrderEvent): void {
    this.eventEmitter.emit(EventType.ORDER_CREATED, event);
  }

  emitOrderStatusUpdated(event: OrderEvent): void {
    this.eventEmitter.emit(EventType.ORDER_STATUS_UPDATED, event);
  }

  emitOrderCancelled(event: OrderEvent): void {
    this.eventEmitter.emit(EventType.ORDER_CANCELLED, event);
  }

  // User events
  emitUserRegistered(event: UserEvent): void {
    this.eventEmitter.emit(EventType.USER_REGISTERED, event);
  }

  emitUserVerified(event: UserEvent): void {
    this.eventEmitter.emit(EventType.USER_VERIFIED, event);
  }

  emitUserPasswordReset(event: UserEvent): void {
    this.eventEmitter.emit(EventType.USER_PASSWORD_RESET, event);
  }

  // Vendor events
  emitVendorRegistered(event: VendorEvent): void {
    this.eventEmitter.emit(EventType.VENDOR_REGISTERED, event);
  }

  emitVendorApproved(event: VendorEvent): void {
    this.eventEmitter.emit(EventType.VENDOR_APPROVED, event);
  }

  emitVendorRejected(event: VendorEvent): void {
    this.eventEmitter.emit(EventType.VENDOR_REJECTED, event);
  }

  // Product events
  emitProductCreated(event: ProductEvent): void {
    this.eventEmitter.emit(EventType.PRODUCT_CREATED, event);
  }

  emitProductUpdated(event: ProductEvent): void {
    this.eventEmitter.emit(EventType.PRODUCT_UPDATED, event);
  }

  emitProductDeleted(event: ProductEvent): void {
    this.eventEmitter.emit(EventType.PRODUCT_DELETED, event);
  }

  // Notification events
  emitNotificationSent(event: NotificationEvent): void {
    this.eventEmitter.emit(EventType.NOTIFICATION_SENT, event);
  }
}