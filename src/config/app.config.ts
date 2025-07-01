import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface RabbitMQConfig {
  url: string;
  queues: {
    order: string;
    payment: string;
    notification: string;
    stock: string;
  };
  dlqSuffix: string;
}

export interface BatchConfig {
  size: number;
  timeout: number;
}

export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoffFactor: number;
}

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  }),
);

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'ecommerce_events',
  }),
);

export const rabbitmqConfig = registerAs(
  'rabbitmq',
  (): RabbitMQConfig => ({
    url: process.env.RABBITMQ_URL || 'amqp://rabbitmq:rabbitmq@localhost:5672',
    queues: {
      order: process.env.RABBITMQ_QUEUE_ORDER || 'order.events',
      payment: process.env.RABBITMQ_QUEUE_PAYMENT || 'payment.events',
      notification: process.env.RABBITMQ_QUEUE_NOTIFICATION || 'notification.events',
      stock: process.env.RABBITMQ_QUEUE_STOCK || 'stock.events',
    },
    dlqSuffix: process.env.RABBITMQ_DLQ_SUFFIX || '.dlq',
  }),
);

export const batchConfig = registerAs(
  'batch',
  (): BatchConfig => ({
    size: parseInt(process.env.BATCH_SIZE || '50', 10),
    timeout: parseInt(process.env.BATCH_TIMEOUT || '30000', 10),
  }),
);

export const retryConfig = registerAs(
  'retry',
  (): RetryConfig => ({
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
    delay: parseInt(process.env.RETRY_DELAY || '5000', 10),
    backoffFactor: parseInt(process.env.RETRY_BACKOFF_FACTOR || '2', 10),
  }),
); 