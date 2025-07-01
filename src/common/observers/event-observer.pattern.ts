import { Logger } from '@nestjs/common';
import { DomainEvent, EventType } from '../types/event.types';

export interface EventObserver {
  update(event: DomainEvent): Promise<void>;
  getInterestedEvents(): EventType[];
  getName(): string;
  isInterestedIn(eventType: EventType): boolean;
}

export abstract class BaseEventObserver implements EventObserver {
  protected readonly logger = new Logger(this.constructor.name);

  abstract update(event: DomainEvent): Promise<void>;
  abstract getInterestedEvents(): EventType[];
  abstract getName(): string;

  isInterestedIn(eventType: EventType): boolean {
    return this.getInterestedEvents().includes(eventType);
  }
}

export class EventSubject {
  private observers: EventObserver[] = [];
  private readonly logger = new Logger(EventSubject.name);

  attach(observer: EventObserver): void {
    const isExist = this.observers.includes(observer);
    if (isExist) {
      this.logger.warn(`Observer ${observer.getName()} already attached`);
      return;
    }

    this.observers.push(observer);
    this.logger.log(`Observer ${observer.getName()} attached`);
  }

  detach(observer: EventObserver): void {
    const observerIndex = this.observers.indexOf(observer);
    if (observerIndex === -1) {
      this.logger.warn(`Observer ${observer.getName()} not found`);
      return;
    }

    this.observers.splice(observerIndex, 1);
    this.logger.log(`Observer ${observer.getName()} detached`);
  }

  async notify(event: DomainEvent): Promise<void> {
    const interestedObservers = this.observers.filter(observer => 
      observer.isInterestedIn(event.type)
    );

    if (interestedObservers.length === 0) {
      this.logger.debug(`No observers interested in event type: ${event.type}`);
      return;
    }

    this.logger.log(`Notifying ${interestedObservers.length} observers for event type: ${event.type}`);

    // Notify all interested observers in parallel
    const notificationPromises = interestedObservers.map(async (observer) => {
      try {
        await observer.update(event);
        this.logger.debug(`Observer ${observer.getName()} updated successfully`);
      } catch (error) {
        this.logger.error(
          `Observer ${observer.getName()} failed to update: ${error.message}`,
          error.stack,
        );
        // Don't rethrow - we don't want one observer failure to affect others
      }
    });

    await Promise.allSettled(notificationPromises);
  }

  getObserversCount(): number {
    return this.observers.length;
  }

  getObservers(): EventObserver[] {
    return [...this.observers]; // Return a copy to prevent external modification
  }
} 