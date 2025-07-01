import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as winston from 'winston';
import { WinstonModule } from 'nest-winston';

async function bootstrap() {
  // Winston logger configuration
  const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance: winstonLogger,
    }),
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('E-commerce Event Processor API')
    .setDescription(`
      ## 🚀 Sistema de Processamento de Eventos em Tempo Real

      Esta API fornece um sistema robusto de processamento de eventos para e-commerce, 
      utilizando arquitetura orientada a eventos com RabbitMQ e processamento em lote.

      ### 🎯 Funcionalidades Principais
      - **Processamento de Eventos**: Criação e processamento assíncrono de eventos
      - **Processamento em Lote**: Otimização para alta performance
      - **Monitoramento**: Métricas e estatísticas em tempo real
      - **Auditoria**: Rastreamento completo de eventos
      - **Retry Logic**: Mecanismo robusto de reprocessamento

      ### 📋 Tipos de Eventos Suportados
      - **ORDER_CREATED**: Criação de pedidos
      - **ORDER_UPDATED**: Atualização de pedidos  
      - **ORDER_CANCELLED**: Cancelamento de pedidos
      - **PAYMENT_CONFIRMED**: Confirmação de pagamento
      - **PAYMENT_FAILED**: Falha no pagamento
      - **STOCK_UPDATED**: Atualização de estoque
      - **STOCK_RESERVED**: Reserva de estoque
      - **NOTIFICATION_REQUESTED**: Solicitação de notificação

      ### 🔄 Canais de Notificação
      - **EMAIL**: Notificações por e-mail
      - **SMS**: Notificações por SMS
      - **PUSH**: Notificações push

      ### 🏗️ Arquitetura
      - **Design Patterns**: Strategy, Observer, Factory
      - **Message Broker**: RabbitMQ com filas dedicadas
      - **Database**: PostgreSQL com TypeORM
      - **Batch Processing**: Processamento otimizado em lotes
      - **Logging**: Winston com logs estruturados
    `)
    .setVersion('1.0.0')
    .addServer('http://localhost:3000', 'Desenvolvimento Local')
    .addServer('https://api.empresa.com', 'Produção')
    .addTag('events', 'Operações de criação e publicação de eventos')
    .addTag('monitoring', 'Monitoramento do sistema e estatísticas')
    .addTag('health', 'Verificações de saúde da aplicação')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT para autenticação (futuro)',
      },
      'JWT-auth'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'E-commerce Event Processor API',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1976d2 }
      .swagger-ui .scheme-container { background: #fafafa; padding: 15px; border-radius: 4px; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    },
  });

  const port = configService.get<number>('app.port', 3000);
  
  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
  logger.log(`❤️ Health check: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
}); 