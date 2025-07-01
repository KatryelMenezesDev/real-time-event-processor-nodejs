import { Module } from '@nestjs/common';
import { NotificationProcessorStrategy } from './strategies/notification-processor.strategy';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [NotificationProcessorStrategy],
  exports: [NotificationProcessorStrategy],
})
export class NotificationModule {} 