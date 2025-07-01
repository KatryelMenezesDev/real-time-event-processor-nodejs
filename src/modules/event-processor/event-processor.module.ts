import { Module } from '@nestjs/common';
import { EventProcessorService } from './event-processor.service';
import { EventController } from './event.controller';
import { OrderModule } from '../order/order.module';
import { NotificationModule } from '../notification/notification.module';
import { AuditModule } from '../audit/audit.module';
import { BatchModule } from '../batch/batch.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    CommonModule,
    OrderModule,
    NotificationModule,
    AuditModule,
    BatchModule,
  ],
  controllers: [EventController],
  providers: [EventProcessorService],
  exports: [EventProcessorService],
})
export class EventProcessorModule {} 