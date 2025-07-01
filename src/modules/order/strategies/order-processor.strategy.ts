import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseEventProcessorStrategy } from '../../../common/strategies/event-processor.strategy';
import { DomainEvent, EventType, OrderCreatedEvent, OrderUpdatedEvent, OrderCancelledEvent, OrderStatus } from '../../../common/types/event.types';
import { Order, OrderItem } from '../../../common/entities';

@Injectable()
export class OrderProcessorStrategy extends BaseEventProcessorStrategy {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {
    super();
  }

  canHandle(eventType: EventType): boolean {
    return [
      EventType.ORDER_CREATED,
      EventType.ORDER_UPDATED,
      EventType.ORDER_CANCELLED,
    ].includes(eventType);
  }

  async process(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case EventType.ORDER_CREATED:
        await this.handleOrderCreated(event as OrderCreatedEvent);
        break;
      case EventType.ORDER_UPDATED:
        await this.handleOrderUpdated(event as OrderUpdatedEvent);
        break;
      case EventType.ORDER_CANCELLED:
        await this.handleOrderCancelled(event as OrderCancelledEvent);
        break;
      default:
        throw new Error(`Unsupported event type: ${event.type}`);
    }
  }

  getBatchSize(): number {
    return 25; // Orders can be processed in batches of 25
  }

  supportsBatchProcessing(): boolean {
    return true; // Order events support batch processing
  }

  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(`Processing ORDER_CREATED event for order ${event.payload.orderId}`);

    await this.retry(async () => {
      // Create order
      const order = this.orderRepository.create({
        id: event.payload.orderId,
        customerId: event.payload.customerId,
        totalAmount: event.payload.totalAmount,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await this.orderRepository.save(order);

      // Create order items
      const orderItems = event.payload.items.map(item =>
        this.orderItemRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })
      );

      await this.orderItemRepository.save(orderItems);

      this.logger.log(`Order ${event.payload.orderId} created successfully`);
    });
  }

  private async handleOrderUpdated(event: OrderUpdatedEvent): Promise<void> {
    this.logger.log(`Processing ORDER_UPDATED event for order ${event.payload.orderId}`);

    await this.retry(async () => {
      const order = await this.orderRepository.findOne({
        where: { id: event.payload.orderId },
      });

      if (!order) {
        throw new Error(`Order ${event.payload.orderId} not found`);
      }

      order.status = event.payload.status;
      order.updatedAt = new Date();

      await this.orderRepository.save(order);

      this.logger.log(
        `Order ${event.payload.orderId} status updated from ${event.payload.previousStatus} to ${event.payload.status}`
      );
    });
  }

  private async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    this.logger.log(`Processing ORDER_CANCELLED event for order ${event.payload.orderId}`);

    await this.retry(async () => {
      const order = await this.orderRepository.findOne({
        where: { id: event.payload.orderId },
      });

      if (!order) {
        throw new Error(`Order ${event.payload.orderId} not found`);
      }

      order.status = OrderStatus.CANCELLED;
      order.updatedAt = new Date();

      await this.orderRepository.save(order);

      this.logger.log(
        `Order ${event.payload.orderId} cancelled. Reason: ${event.payload.reason}`
      );
    });
  }
} 