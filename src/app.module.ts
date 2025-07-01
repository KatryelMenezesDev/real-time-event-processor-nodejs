import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { 
  appConfig, 
  databaseConfig, 
  rabbitmqConfig, 
  batchConfig, 
  retryConfig 
} from './config/app.config';
import * as entities from './common/entities';
import { EventProcessorModule } from './modules/event-processor/event-processor.module';
import { OrderModule } from './modules/order/order.module';
import { NotificationModule } from './modules/notification/notification.module';
import { BatchModule } from './modules/batch/batch.module';
import { AuditModule } from './modules/audit/audit.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // TypeORM Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: true,
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    EventProcessorModule,
    OrderModule,
    NotificationModule,
    BatchModule,
    AuditModule,
    MonitoringModule,
    HealthModule,
  ],
})
export class AppModule {} 