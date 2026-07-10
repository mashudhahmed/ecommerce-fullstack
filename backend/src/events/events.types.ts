// src/events/events.types.ts
export enum EventType {
  // Order events
  ORDER_CREATED = 'order.created',
  ORDER_STATUS_UPDATED = 'order.status.updated',
  ORDER_CANCELLED = 'order.cancelled',

  // User events
  USER_REGISTERED = 'user.registered',
  USER_VERIFIED = 'user.verified',
  USER_PASSWORD_RESET = 'user.password.reset',

  // Vendor events
  VENDOR_REGISTERED = 'vendor.registered',
  VENDOR_APPROVED = 'vendor.approved',
  VENDOR_REJECTED = 'vendor.rejected',

  // Product events
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',

  // Review events
  REVIEW_CREATED = 'review.created',
  REVIEW_UPDATED = 'review.updated',
  REVIEW_DELETED = 'review.deleted',

  // Notification events
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_READ = 'notification.read',
}

export interface OrderEvent {
  orderId: number;
  userId: number;
  status?: string;
  data?: Record<string, any>;
}

export interface UserEvent {
  userId: number;
  email: string;
  name: string;
  role?: string;
}

export interface VendorEvent {
  vendorId: number;
  email: string;
  name: string;
  businessName: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ProductEvent {
  productId: number;
  vendorId: number;
  title: string;
  action: 'created' | 'updated' | 'deleted';
}

export interface NotificationEvent {
  userId: number;
  type: string;
  title: string;
  content: string;
  data?: Record<string, any>;
}