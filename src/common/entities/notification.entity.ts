import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { NotificationChannel } from '../types/event.types';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  recipientId: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  channel: NotificationChannel;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string;

  @Column('text')
  content: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
} 