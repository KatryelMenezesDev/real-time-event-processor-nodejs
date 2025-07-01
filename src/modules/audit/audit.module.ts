import { Module } from '@nestjs/common';
import { AuditObserver } from './observers/audit.observer';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [AuditObserver],
  exports: [AuditObserver],
})
export class AuditModule {} 