export enum EventType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  STOCK_UPDATED = 'STOCK_UPDATED',
  STOCK_RESERVED = 'STOCK_RESERVED',
  NOTIFICATION_REQUESTED = 'NOTIFICATION_REQUESTED',
}

export enum EventStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRY = 'RETRY',
  DEAD_LETTER = 'DEAD_LETTER',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// Base interface for all events
export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  correlationId?: string;
  version: number;
}

// Order Events
export interface OrderCreatedEvent extends BaseEvent {
  type: EventType.ORDER_CREATED;
  payload: {
    orderId: string;
    customerId: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    totalAmount: number;
  };
}

export interface OrderUpdatedEvent extends BaseEvent {
  type: EventType.ORDER_UPDATED;
  payload: {
    orderId: string;
    status: OrderStatus;
    previousStatus: OrderStatus;
  };
}

export interface OrderCancelledEvent extends BaseEvent {
  type: EventType.ORDER_CANCELLED;
  payload: {
    orderId: string;
    reason: string;
    customerId: string;
  };
}

// Payment Events
export interface PaymentConfirmedEvent extends BaseEvent {
  type: EventType.PAYMENT_CONFIRMED;
  payload: {
    paymentId: string;
    orderId: string;
    amount: number;
    transactionId: string;
    paymentMethod: string;
  };
}

export interface PaymentFailedEvent extends BaseEvent {
  type: EventType.PAYMENT_FAILED;
  payload: {
    paymentId: string;
    orderId: string;
    amount: number;
    reason: string;
    paymentMethod: string;
  };
}

// Stock Events
export interface StockUpdatedEvent extends BaseEvent {
  type: EventType.STOCK_UPDATED;
  payload: {
    productId: string;
    previousQuantity: number;
    newQuantity: number;
    operation: 'INCREASE' | 'DECREASE';
  };
}

export interface StockReservedEvent extends BaseEvent {
  type: EventType.STOCK_RESERVED;
  payload: {
    productId: string;
    quantity: number;
    orderId: string;
    reservationId: string;
  };
}

// Notification Events
export interface NotificationRequestedEvent extends BaseEvent {
  type: EventType.NOTIFICATION_REQUESTED;
  payload: {
    recipientId: string;
    channel: NotificationChannel;
    templateId: string;
    subject?: string;
    content: string;
    metadata?: Record<string, any>;
  };
}

// Union type for all events
export type DomainEvent = 
  | OrderCreatedEvent
  | OrderUpdatedEvent
  | OrderCancelledEvent
  | PaymentConfirmedEvent
  | PaymentFailedEvent
  | StockUpdatedEvent
  | StockReservedEvent
  | NotificationRequestedEvent;

// Message wrapper for RabbitMQ
export interface EventMessage<T extends DomainEvent = DomainEvent> {
  event: T;
  metadata: {
    messageId: string;
    routingKey: string;
    timestamp: Date;
    attempts: number;
    maxAttempts: number;
    delayMs?: number;
  };
}

// Batch processing types
export interface BatchJob {
  id: string;
  type: string;
  events: DomainEvent[];
  batchSize: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
} 