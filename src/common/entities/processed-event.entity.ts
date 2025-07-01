import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { EventStatus } from '../types/event.types';

@Entity('processed_events')
export class ProcessedEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  eventId: string;

  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  @Column('jsonb')
  payload: any;

  @Column({
    type: 'varchar',
    length: 50,
  })
  status: EventStatus;

  @Column('int', { default: 0 })
  processingAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;
} 