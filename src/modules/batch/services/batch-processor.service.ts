import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DomainEvent, EventType, BatchJob } from '../../../common/types/event.types';
import { ConcreteEventProcessorFactory } from '../../../common/factories/event-processor.factory';
import { v4 as uuidv4 } from 'uuid';

interface PendingBatch {
  eventType: EventType;
  events: DomainEvent[];
  createdAt: Date;
  maxSize: number;
}

@Injectable()
export class BatchProcessorService {
  private readonly logger = new Logger(BatchProcessorService.name);
  private readonly pendingBatches = new Map<EventType, PendingBatch>();
  private readonly activeBatches = new Map<string, BatchJob>();
  
  private readonly batchSize: number;
  private readonly batchTimeout: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly processorFactory: ConcreteEventProcessorFactory,
  ) {
    this.batchSize = this.configService.get<number>('batch.size', 50);
    this.batchTimeout = this.configService.get<number>('batch.timeout', 30000);
    
    this.logger.log(
      `BatchProcessorService initialized with batchSize: ${this.batchSize}, timeout: ${this.batchTimeout}ms`
    );
  }

  async addEventToBatch(event: DomainEvent): Promise<void> {
    const processor = this.processorFactory.createProcessor(event.type);
    
    if (!processor || !processor.supportsBatchProcessing()) {
      this.logger.debug(`Event type ${event.type} does not support batch processing`);
      return;
    }

    const batchSize = processor.getBatchSize();
    let batch = this.pendingBatches.get(event.type);

    if (!batch) {
      batch = {
        eventType: event.type,
        events: [],
        createdAt: new Date(),
        maxSize: batchSize,
      };
      this.pendingBatches.set(event.type, batch);
      this.logger.debug(`Created new batch for event type: ${event.type}`);
    }

    batch.events.push(event);
    this.logger.debug(
      `Added event ${event.id} to batch for ${event.type}. Batch size: ${batch.events.length}/${batch.maxSize}`
    );

    // Check if batch is ready for processing
    if (batch.events.length >= batch.maxSize) {
      await this.processBatch(event.type);
    }
  }

  // Cron job to process batches that have timed out
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processTimedOutBatches(): Promise<void> {
    const now = new Date();
    const timedOutBatches: EventType[] = [];

    for (const [eventType, batch] of this.pendingBatches.entries()) {
      const batchAge = now.getTime() - batch.createdAt.getTime();
      
      if (batchAge >= this.batchTimeout && batch.events.length > 0) {
        timedOutBatches.push(eventType);
      }
    }

    if (timedOutBatches.length > 0) {
      this.logger.log(`Processing ${timedOutBatches.length} timed-out batches`);
      
      for (const eventType of timedOutBatches) {
        await this.processBatch(eventType);
      }
    }
  }

  private async processBatch(eventType: EventType): Promise<void> {
    const batch = this.pendingBatches.get(eventType);
    
    if (!batch || batch.events.length === 0) {
      return;
    }

    // Remove batch from pending
    this.pendingBatches.delete(eventType);

    const batchJob: BatchJob = {
      id: uuidv4(),
      type: eventType,
      events: [...batch.events],
      batchSize: batch.events.length,
      status: 'PROCESSING',
      createdAt: batch.createdAt,
      startedAt: new Date(),
    };

    this.activeBatches.set(batchJob.id, batchJob);

    this.logger.log(
      `Processing batch ${batchJob.id} for event type ${eventType} with ${batchJob.batchSize} events`
    );

    try {
      const processor = this.processorFactory.createProcessor(eventType);
      
      if (!processor) {
        throw new Error(`No processor found for event type: ${eventType}`);
      }

      // Process all events in the batch
      const processingPromises = batch.events.map(event => 
        this.processEventWithRetry(processor.process.bind(processor), event)
      );

      await Promise.all(processingPromises);

      // Update batch status
      batchJob.status = 'COMPLETED';
      batchJob.completedAt = new Date();

      const duration = batchJob.completedAt.getTime() - batchJob.startedAt!.getTime();
      this.logger.log(
        `Batch ${batchJob.id} completed successfully in ${duration}ms. Processed ${batchJob.batchSize} events.`
      );

    } catch (error) {
      batchJob.status = 'FAILED';
      batchJob.error = error.message;
      batchJob.completedAt = new Date();

      this.logger.error(
        `Batch ${batchJob.id} failed: ${error.message}`,
        error.stack
      );

      // Optionally, could implement retry logic for failed batches
      // or send failed events to DLQ
    } finally {
      // Clean up completed batch after some time
      setTimeout(() => {
        this.activeBatches.delete(batchJob.id);
      }, 60000); // Keep for 1 minute for monitoring
    }
  }

  private async processEventWithRetry<T>(
    processFn: (event: DomainEvent) => Promise<T>,
    event: DomainEvent,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await processFn(event);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Event ${event.id} processing attempt ${attempt}/${maxRetries} failed: ${error.message}`
        );

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
          );
        }
      }
    }

    throw lastError!;
  }

  // Monitoring methods
  getBatchStatistics(): {
    pendingBatches: number;
    activeBatches: number;
    totalPendingEvents: number;
    batchesByType: Record<string, number>;
  } {
    const batchesByType: Record<string, number> = {};
    let totalPendingEvents = 0;

    for (const [eventType, batch] of this.pendingBatches.entries()) {
      batchesByType[eventType] = batch.events.length;
      totalPendingEvents += batch.events.length;
    }

    return {
      pendingBatches: this.pendingBatches.size,
      activeBatches: this.activeBatches.size,
      totalPendingEvents,
      batchesByType,
    };
  }

  getActiveBatches(): BatchJob[] {
    return Array.from(this.activeBatches.values());
  }

  async forceBatchProcessing(eventType?: EventType): Promise<void> {
    if (eventType) {
      await this.processBatch(eventType);
    } else {
      // Process all pending batches
      const eventTypes = Array.from(this.pendingBatches.keys());
      for (const type of eventTypes) {
        await this.processBatch(type);
      }
    }
  }
} 