import { Injectable, Logger } from '@nestjs/common';
import { EventProcessorStrategy } from '../strategies/event-processor.strategy';
import { EventType } from '../types/event.types';

export abstract class EventProcessorFactory {
  protected readonly logger = new Logger(this.constructor.name);
  
  abstract createProcessor(eventType: EventType): EventProcessorStrategy | null;
  abstract getSupportedEventTypes(): EventType[];
}

@Injectable()
export class ConcreteEventProcessorFactory extends EventProcessorFactory {
  private readonly processorRegistry = new Map<EventType, () => EventProcessorStrategy>();

  constructor(private readonly processors: EventProcessorStrategy[]) {
    super();
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    this.processors.forEach(processor => {
      const supportedTypes = this.getSupportedEventTypesForProcessor(processor);
      
      supportedTypes.forEach(eventType => {
        this.processorRegistry.set(eventType, () => processor);
        this.logger.debug(`Registered processor for event type: ${eventType}`);
      });
    });

    this.logger.log(`Initialized factory with ${this.processorRegistry.size} event type mappings`);
  }

  private getSupportedEventTypesForProcessor(processor: EventProcessorStrategy): EventType[] {
    return Object.values(EventType).filter(eventType => 
      processor.canHandle(eventType)
    );
  }

  createProcessor(eventType: EventType): EventProcessorStrategy | null {
    const processorFactory = this.processorRegistry.get(eventType);
    
    if (!processorFactory) {
      this.logger.warn(`No processor found for event type: ${eventType}`);
      return null;
    }

    return processorFactory();
  }

  getSupportedEventTypes(): EventType[] {
    return Array.from(this.processorRegistry.keys());
  }
} 