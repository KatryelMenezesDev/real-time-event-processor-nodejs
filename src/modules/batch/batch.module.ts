import { Module } from '@nestjs/common';
import { BatchProcessorService } from './services/batch-processor.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [BatchProcessorService],
  exports: [BatchProcessorService],
})
export class BatchModule {} 