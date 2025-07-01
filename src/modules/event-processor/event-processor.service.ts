import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainEvent, EventMessage, EventType } from '../../common/types/event.types';
import { ConcreteEventProcessorFactory } from '../../common/factories/event-processor.factory';
import { EventSubject } from '../../common/observers/event-observer.pattern';
import { BatchProcessorService } from '../batch/services/batch-processor.service';
import { OrderProcessorStrategy } from '../order/strategies/order-processor.strategy';
import { NotificationProcessorStrategy } from '../notification/strategies/notification-processor.strategy';
import { AuditObserver } from '../audit/observers/audit.observer';

@Injectable()
export class EventProcessorService implements OnModuleInit {
  private readonly logger = new Logger(EventProcessorService.name);
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly processorFactory: ConcreteEventProcessorFactory,
    private readonly eventSubject: EventSubject,
    private readonly batchProcessor: BatchProcessorService,
    private readonly orderProcessor: OrderProcessorStrategy,
    private readonly notificationProcessor: NotificationProcessorStrategy,
    private readonly auditObserver: AuditObserver,
  ) {
    this.maxRetries = this.configService.get<number>('retry.maxAttempts', 3);
    this.retryDelay = this.configService.get<number>('retry.delay', 5000);
  }

  onModuleInit() {
    this.initializeProcessors();
    this.initializeObservers();
    this.logger.log('EventProcessorService initialized');
  }

  private initializeProcessors() {
    // Recreate factory with actual processors
    const processors = [this.orderProcessor, this.notificationProcessor];
    (this.processorFactory as any).processors = processors;
    (this.processorFactory as any).initializeRegistry();
    
    this.logger.log('Event processors initialized');
  }

  private initializeObservers() {
    this.eventSubject.attach(this.auditObserver);
    this.logger.log('Event observers initialized');
  }

  async processEvent(event: DomainEvent): Promise<void> {
    this.logger.log(`Processing event ${event.id} of type ${event.type}`);

    try {
      const processor = this.processorFactory.createProcessor(event.type);
      
      if (!processor) {
        throw new Error(`No processor found for event type: ${event.type}`);
      }

      if (processor.supportsBatchProcessing()) {
        await this.batchProcessor.addEventToBatch(event);
      } else {
        await processor.process(event);
      }

      // Notify observers
      await this.eventSubject.notify(event);

      this.logger.log(`Event ${event.id} processed successfully`);

    } catch (error) {
      this.logger.error(
        `Failed to process event ${event.id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async publishOrderEvent(event: DomainEvent): Promise<void> {
    this.logger.log(`Publishing order event ${event.id} of type ${event.type}`);
    // For now, just process the event directly
    await this.processEvent(event);
  }

  async publishNotificationEvent(event: DomainEvent): Promise<void> {
    this.logger.log(`Publishing notification event ${event.id} of type ${event.type}`);
    // For now, just process the event directly
    await this.processEvent(event);
  }
} 