import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseEventProcessorStrategy } from '../../../common/strategies/event-processor.strategy';
import { DomainEvent, EventType, NotificationRequestedEvent } from '../../../common/types/event.types';
import { Notification } from '../../../common/entities';

@Injectable()
export class NotificationProcessorStrategy extends BaseEventProcessorStrategy {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {
    super();
  }

  canHandle(eventType: EventType): boolean {
    return eventType === EventType.NOTIFICATION_REQUESTED;
  }

  async process(event: DomainEvent): Promise<void> {
    if (event.type !== EventType.NOTIFICATION_REQUESTED) {
      throw new Error(`Unsupported event type: ${event.type}`);
    }

    await this.handleNotificationRequested(event as NotificationRequestedEvent);
  }

  getBatchSize(): number {
    return 100; // Notifications can be processed in large batches
  }

  supportsBatchProcessing(): boolean {
    return true; // Notification events are perfect for batch processing
  }

  private async handleNotificationRequested(event: NotificationRequestedEvent): Promise<void> {
    this.logger.log(`Processing NOTIFICATION_REQUESTED event for recipient ${event.payload.recipientId}`);

    await this.retry(async () => {
      // Create notification record
      const notification = this.notificationRepository.create({
        recipientId: event.payload.recipientId,
        type: event.payload.templateId,
        channel: event.payload.channel,
        subject: event.payload.subject,
        content: event.payload.content,
        status: 'PENDING',
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // Simulate sending notification based on channel
      await this.sendNotification(savedNotification);

      this.logger.log(`Notification ${savedNotification.id} processed successfully`);
    });
  }

  private async sendNotification(notification: Notification): Promise<void> {
    // Simulate sending notification
    // In a real application, this would integrate with email service, SMS service, etc.
    
    try {
      switch (notification.channel) {
        case 'EMAIL':
          await this.sendEmail(notification);
          break;
        case 'SMS':
          await this.sendSMS(notification);
          break;
        case 'PUSH':
          await this.sendPushNotification(notification);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }

      // Update notification status
      notification.status = 'SENT';
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);

    } catch (error) {
      this.logger.error(`Failed to send notification ${notification.id}: ${error.message}`);
      notification.status = 'FAILED';
      await this.notificationRepository.save(notification);
      throw error;
    }
  }

  private async sendEmail(notification: Notification): Promise<void> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.logger.log(`Email sent to recipient ${notification.recipientId}: ${notification.subject}`);
  }

  private async sendSMS(notification: Notification): Promise<void> {
    // Simulate SMS sending delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    this.logger.log(`SMS sent to recipient ${notification.recipientId}`);
  }

  private async sendPushNotification(notification: Notification): Promise<void> {
    // Simulate push notification sending delay
    await new Promise(resolve => setTimeout(resolve, 30));
    
    this.logger.log(`Push notification sent to recipient ${notification.recipientId}`);
  }

  // Batch processing method for notifications
  async processBatch(events: NotificationRequestedEvent[]): Promise<void> {
    this.logger.log(`Processing batch of ${events.length} notification events`);

    const notifications = events.map(event =>
      this.notificationRepository.create({
        recipientId: event.payload.recipientId,
        type: event.payload.templateId,
        channel: event.payload.channel,
        subject: event.payload.subject,
        content: event.payload.content,
        status: 'PENDING',
      })
    );

    // Bulk insert notifications
    const savedNotifications = await this.notificationRepository.save(notifications);

    // Group by channel for optimized sending
    const grouped = this.groupNotificationsByChannel(savedNotifications);

    // Process each channel group
    for (const [channel, channelNotifications] of Object.entries(grouped)) {
      try {
        await this.processBatchByChannel(channel, channelNotifications);
      } catch (error) {
        this.logger.error(`Failed to process batch for channel ${channel}: ${error.message}`);
        // Mark failed notifications
        await this.markNotificationsAsFailed(channelNotifications);
      }
    }

    this.logger.log(`Batch processing completed for ${events.length} notifications`);
  }

  private groupNotificationsByChannel(notifications: Notification[]): Record<string, Notification[]> {
    return notifications.reduce((acc, notification) => {
      if (!acc[notification.channel]) {
        acc[notification.channel] = [];
      }
      acc[notification.channel].push(notification);
      return acc;
    }, {} as Record<string, Notification[]>);
  }

  private async processBatchByChannel(channel: string, notifications: Notification[]): Promise<void> {
    this.logger.log(`Processing batch of ${notifications.length} ${channel} notifications`);

    // Simulate batch processing for each channel
    switch (channel) {
      case 'EMAIL':
        await this.processBatchEmail(notifications);
        break;
      case 'SMS':
        await this.processBatchSMS(notifications);
        break;
      case 'PUSH':
        await this.processBatchPush(notifications);
        break;
      default:
        throw new Error(`Unsupported batch channel: ${channel}`);
    }
  }

  private async processBatchEmail(notifications: Notification[]): Promise<void> {
    // Simulate batch email processing (e.g., using email service bulk API)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Mark all as sent
    await this.markNotificationsAsSent(notifications);
    this.logger.log(`Batch of ${notifications.length} emails sent successfully`);
  }

  private async processBatchSMS(notifications: Notification[]): Promise<void> {
    // Simulate batch SMS processing
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Mark all as sent
    await this.markNotificationsAsSent(notifications);
    this.logger.log(`Batch of ${notifications.length} SMS sent successfully`);
  }

  private async processBatchPush(notifications: Notification[]): Promise<void> {
    // Simulate batch push notification processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mark all as sent
    await this.markNotificationsAsSent(notifications);
    this.logger.log(`Batch of ${notifications.length} push notifications sent successfully`);
  }

  private async markNotificationsAsSent(notifications: Notification[]): Promise<void> {
    const now = new Date();
    const updates = notifications.map(notification => ({
      ...notification,
      status: 'SENT' as const,
      sentAt: now,
    }));

    await this.notificationRepository.save(updates);
  }

  private async markNotificationsAsFailed(notifications: Notification[]): Promise<void> {
    const updates = notifications.map(notification => ({
      ...notification,
      status: 'FAILED' as const,
    }));

    await this.notificationRepository.save(updates);
  }
} 