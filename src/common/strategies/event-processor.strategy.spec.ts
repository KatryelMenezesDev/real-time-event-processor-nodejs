import { Test, TestingModule } from '@nestjs/testing';
import { BaseEventProcessorStrategy } from './event-processor.strategy';
import { EventType, DomainEvent } from '../types/event.types';

// Mock implementation for testing
class MockEventProcessorStrategy extends BaseEventProcessorStrategy {
  canHandle(eventType: EventType): boolean {
    return eventType === EventType.ORDER_CREATED;
  }

  async process(event: DomainEvent): Promise<void> {
    // Mock implementation
    if (event.type === EventType.ORDER_CREATED) {
      return Promise.resolve();
    }
    throw new Error('Unsupported event type');
  }
}

describe('BaseEventProcessorStrategy', () => {
  let strategy: MockEventProcessorStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockEventProcessorStrategy],
    }).compile();

    strategy = module.get<MockEventProcessorStrategy>(MockEventProcessorStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should handle supported event types', () => {
    expect(strategy.canHandle(EventType.ORDER_CREATED)).toBe(true);
    expect(strategy.canHandle(EventType.PAYMENT_CONFIRMED)).toBe(false);
  });

  it('should return default batch size', () => {
    expect(strategy.getBatchSize()).toBe(10);
  });

  it('should not support batch processing by default', () => {
    expect(strategy.supportsBatchProcessing()).toBe(false);
  });

  it('should process supported events successfully', async () => {
    const mockEvent: DomainEvent = {
      id: 'test-event-1',
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

    await expect(strategy.process(mockEvent)).resolves.toBeUndefined();
  });

  it('should fail to process unsupported events', async () => {
    const mockEvent: DomainEvent = {
      id: 'test-event-2',
      type: EventType.PAYMENT_CONFIRMED,
      timestamp: new Date(),
      version: 1,
      payload: {},
    } as any;

    await expect(strategy.process(mockEvent)).rejects.toThrow('Unsupported event type');
  });

  it('should retry failed operations', async () => {
    let attemptCount = 0;
    const mockOperation = jest.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('Temporary failure');
      }
      return Promise.resolve('success');
    });

    const result = await strategy['retry'](mockOperation, 3, 100);
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retry attempts', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

    await expect(strategy['retry'](mockOperation, 2, 100)).rejects.toThrow('Persistent failure');
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });
}); 