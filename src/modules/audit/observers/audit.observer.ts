import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseEventObserver } from '../../../common/observers/event-observer.pattern';
import { DomainEvent, EventType, EventStatus } from '../../../common/types/event.types';
import { ProcessedEvent } from '../../../common/entities';

@Injectable()
export class AuditObserver extends BaseEventObserver {
  constructor(
    @InjectRepository(ProcessedEvent)
    private readonly processedEventRepository: Repository<ProcessedEvent>,
  ) {
    super();
  }

  getName(): string {
    return 'AuditObserver';
  }

  getInterestedEvents(): EventType[] {
    // Audit observer is interested in all events
    return Object.values(EventType);
  }

  async update(event: DomainEvent): Promise<void> {
    this.logger.log(`Auditing event: ${event.type} - ${event.id}`);

    try {
      const processedEvent = this.processedEventRepository.create({
        eventId: event.id,
        eventType: event.type,
        payload: event,
        status: EventStatus.COMPLETED,
        processingAttempts: 1,
        processedAt: new Date(),
      });

      await this.processedEventRepository.save(processedEvent);
      
      this.logger.debug(`Event ${event.id} audited successfully`);
    } catch (error) {
      this.logger.error(`Failed to audit event ${event.id}: ${error.message}`);
      
      // Try to save failed audit record
      try {
        const failedEvent = this.processedEventRepository.create({
          eventId: event.id,
          eventType: event.type,
          payload: { error: error.message, originalEvent: event },
          status: EventStatus.FAILED,
          processingAttempts: 1,
          lastAttemptAt: new Date(),
        });

        await this.processedEventRepository.save(failedEvent);
      } catch (auditError) {
        this.logger.error(`Failed to save audit failure record: ${auditError.message}`);
      }

      throw error;
    }
  }
} 