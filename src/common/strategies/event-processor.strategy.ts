import { DomainEvent, EventType } from '../types/event.types';
import { Logger } from '@nestjs/common';

export interface EventProcessorStrategy {
  canHandle(eventType: EventType): boolean;
  process(event: DomainEvent): Promise<void>;
  getBatchSize(): number;
  supportsBatchProcessing(): boolean;
}

export abstract class BaseEventProcessorStrategy implements EventProcessorStrategy {
  protected readonly logger = new Logger(this.constructor.name);

  abstract canHandle(eventType: EventType): boolean;
  abstract process(event: DomainEvent): Promise<void>;

  getBatchSize(): number {
    return 10; // Default batch size
  }

  supportsBatchProcessing(): boolean {
    return false; // Default: no batch processing
  }

  protected async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Attempt ${attempt}/${maxAttempts} failed: ${error.message}`,
        );

        if (attempt < maxAttempts) {
          await this.sleep(delay * Math.pow(2, attempt - 1)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
} 