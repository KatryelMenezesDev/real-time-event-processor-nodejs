import { Module } from '@nestjs/common';
import { OrderProcessorStrategy } from './strategies/order-processor.strategy';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [OrderProcessorStrategy],
  exports: [OrderProcessorStrategy],
})
export class OrderModule {} 