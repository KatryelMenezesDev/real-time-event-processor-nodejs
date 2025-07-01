import { EventSubject, BaseEventObserver } from './event-observer.pattern';
import { EventType, DomainEvent } from '../types/event.types';

// Mock observer implementations for testing
class MockOrderObserver extends BaseEventObserver {
  public updateCallCount = 0;
  public lastEvent: DomainEvent | null = null;

  getName(): string {
    return 'MockOrderObserver';
  }

  getInterestedEvents(): EventType[] {
    return [EventType.ORDER_CREATED, EventType.ORDER_UPDATED];
  }

  async update(event: DomainEvent): Promise<void> {
    this.updateCallCount++;
    this.lastEvent = event;
  }
}

class MockNotificationObserver extends BaseEventObserver {
  public updateCallCount = 0;
  public shouldThrow = false;

  getName(): string {
    return 'MockNotificationObserver';
  }

  getInterestedEvents(): EventType[] {
    return [EventType.NOTIFICATION_REQUESTED];
  }

  async update(event: DomainEvent): Promise<void> {
    this.updateCallCount++;
    if (this.shouldThrow) {
      throw new Error('Mock observer error');
    }
  }
}

describe('EventObserver Pattern', () => {
  let eventSubject: EventSubject;
  let orderObserver: MockOrderObserver;
  let notificationObserver: MockNotificationObserver;

  beforeEach(() => {
    eventSubject = new EventSubject();
    orderObserver = new MockOrderObserver();
    notificationObserver = new MockNotificationObserver();
  });

  describe('EventSubject', () => {
    it('should be defined', () => {
      expect(eventSubject).toBeDefined();
    });

    it('should attach observers', () => {
      eventSubject.attach(orderObserver);
      expect(eventSubject.getObserversCount()).toBe(1);
    });

    it('should not attach duplicate observers', () => {
      eventSubject.attach(orderObserver);
      eventSubject.attach(orderObserver);
      expect(eventSubject.getObserversCount()).toBe(1);
    });

    it('should detach observers', () => {
      eventSubject.attach(orderObserver);
      eventSubject.detach(orderObserver);
      expect(eventSubject.getObserversCount()).toBe(0);
    });

    it('should handle detaching non-existent observers', () => {
      eventSubject.detach(orderObserver);
      expect(eventSubject.getObserversCount()).toBe(0);
    });

    it('should notify interested observers', async () => {
      eventSubject.attach(orderObserver);
      eventSubject.attach(notificationObserver);

      const orderEvent: DomainEvent = {
        id: 'test-order-1',
        type: EventType.ORDER_CREATED,
        timestamp: new Date(),
        version: 1,
        payload: {
          orderId: 'order-1',
          customerId: 'customer-1',
          items: [],
          totalAmount: 100,
        },
      } as any;

      await eventSubject.notify(orderEvent);

      expect(orderObserver.updateCallCount).toBe(1);
      expect(orderObserver.lastEvent).toBe(orderEvent);
      expect(notificationObserver.updateCallCount).toBe(0);
    });

    it('should notify multiple interested observers', async () => {
      const anotherOrderObserver = new MockOrderObserver();
      eventSubject.attach(orderObserver);
      eventSubject.attach(anotherOrderObserver);

      const orderEvent: DomainEvent = {
        id: 'test-order-2',
        type: EventType.ORDER_UPDATED,
        timestamp: new Date(),
        version: 1,
        payload: {},
      } as any;

      await eventSubject.notify(orderEvent);

      expect(orderObserver.updateCallCount).toBe(1);
      expect(anotherOrderObserver.updateCallCount).toBe(1);
    });

    it('should handle observer errors gracefully', async () => {
      notificationObserver.shouldThrow = true;
      eventSubject.attach(notificationObserver);

      const notificationEvent: DomainEvent = {
        id: 'test-notification-1',
        type: EventType.NOTIFICATION_REQUESTED,
        timestamp: new Date(),
        version: 1,
        payload: {},
      } as any;

      // Should not throw despite observer error
      await expect(eventSubject.notify(notificationEvent)).resolves.toBeUndefined();
      expect(notificationObserver.updateCallCount).toBe(1);
    });

    it('should return copy of observers list', () => {
      eventSubject.attach(orderObserver);
      const observers = eventSubject.getObservers();
      
      expect(observers).toHaveLength(1);
      expect(observers[0]).toBe(orderObserver);
      
      // Modifying returned array should not affect internal state
      observers.push(notificationObserver);
      expect(eventSubject.getObserversCount()).toBe(1);
    });
  });

  describe('BaseEventObserver', () => {
    it('should correctly identify interested events', () => {
      expect(orderObserver.isInterestedIn(EventType.ORDER_CREATED)).toBe(true);
      expect(orderObserver.isInterestedIn(EventType.ORDER_UPDATED)).toBe(true);
      expect(orderObserver.isInterestedIn(EventType.NOTIFICATION_REQUESTED)).toBe(false);
    });

    it('should return correct name', () => {
      expect(orderObserver.getName()).toBe('MockOrderObserver');
      expect(notificationObserver.getName()).toBe('MockNotificationObserver');
    });
  });
}); 