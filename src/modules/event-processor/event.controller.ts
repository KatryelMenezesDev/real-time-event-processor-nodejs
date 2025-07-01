import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiProperty, ApiParam } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsEnum, Min, IsUUID, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { EventProcessorService } from './event-processor.service';
import { 
  EventType, 
  OrderCreatedEvent, 
  NotificationRequestedEvent, 
  NotificationChannel 
} from '../../common/types/event.types';
import { v4 as uuidv4 } from 'uuid';

// DTOs for API
class OrderItemDto {
  @ApiProperty({
    description: 'ID único do produto',
    example: 'prod_123456789',
    minLength: 1,
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Quantidade do produto no pedido',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Preço unitário do produto em centavos',
    example: 2999,
    minimum: 0,
  })
  @IsNumber()
  @IsPositive()
  unitPrice: number;
}

class CreateOrderEventDto {
  @ApiProperty({
    description: 'ID único do cliente que está fazendo o pedido',
    example: 'customer_987654321',
    minLength: 1,
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Lista de itens do pedido',
    type: [OrderItemDto],
    example: [
      {
        productId: 'prod_123456789',
        quantity: 2,
        unitPrice: 2999
      },
      {
        productId: 'prod_987654321',
        quantity: 1,
        unitPrice: 4999
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    description: 'Valor total do pedido em centavos (deve corresponder à soma dos itens)',
    example: 10997,
    minimum: 0,
  })
  @IsNumber()
  @IsPositive()
  totalAmount: number;
}

class CreateNotificationEventDto {
  @ApiProperty({
    description: 'ID do destinatário da notificação',
    example: 'user_123456789',
    minLength: 1,
  })
  @IsString()
  recipientId: string;

  @ApiProperty({
    description: 'Canal de envio da notificação',
    enum: NotificationChannel,
    example: NotificationChannel.EMAIL,
    enumName: 'NotificationChannel',
  })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({
    description: 'ID do template de notificação a ser usado',
    example: 'welcome_email_template',
    minLength: 1,
  })
  @IsString()
  templateId: string;

  @ApiProperty({
    description: 'Assunto da notificação (opcional, usado principalmente para EMAIL)',
    example: 'Bem-vindo à nossa plataforma!',
    required: false,
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    description: 'Conteúdo principal da notificação',
    example: 'Olá! Seja bem-vindo à nossa plataforma. Esperamos que tenha uma ótima experiência conosco.',
    minLength: 1,
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Metadados adicionais para a notificação (opcional)',
    example: {
      priority: 'high',
      category: 'welcome',
      campaignId: 'campaign_001'
    },
    required: false,
    type: 'object',
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

class EventResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação',
    example: 'Order event published successfully'
  })
  message: string;

  @ApiProperty({
    description: 'ID único do evento criado',
    example: 'evt_6792410a-ac42-4f0c-a3fe-89c930ff4688'
  })
  eventId: string;
}

class OrderEventResponseDto extends EventResponseDto {
  @ApiProperty({
    description: 'ID único do pedido criado',
    example: 'order_32576a75-dbe5-4724-a3e6-0ac96a195176'
  })
  orderId: string;
}

class NotificationEventResponseDto extends EventResponseDto {
  @ApiProperty({
    description: 'Canal usado para a notificação',
    enum: NotificationChannel,
    example: NotificationChannel.EMAIL
  })
  channel: NotificationChannel;
}

class BulkNotificationResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação do processamento em lote',
    example: '100 notification events published for batch processing test'
  })
  message: string;

  @ApiProperty({
    description: 'Primeiros 10 IDs dos eventos criados',
    example: ['evt_1', 'evt_2', 'evt_3'],
    type: [String]
  })
  eventIds: string[];

  @ApiProperty({
    description: 'Total de eventos criados',
    example: 100
  })
  totalEvents: number;
}

class SupportedEventTypesDto {
  @ApiProperty({
    description: 'Lista de tipos de eventos suportados',
    example: ['ORDER_CREATED', 'ORDER_UPDATED', 'NOTIFICATION_REQUESTED'],
    type: [String]
  })
  eventTypes: string[];

  @ApiProperty({
    description: 'Lista de canais de notificação suportados',
    example: ['EMAIL', 'SMS', 'PUSH'],
    type: [String]
  })
  notificationChannels: string[];
}

@ApiTags('events')
@Controller('events')
export class EventController {
  constructor(private readonly eventProcessorService: EventProcessorService) {}

  @Post('orders')
  @ApiOperation({ 
    summary: 'Criar e publicar evento de pedido',
    description: `
      Cria um novo evento de pedido e o publica no RabbitMQ para processamento assíncrono.
      
      **Funcionalidades:**
      - Validação automática dos dados do pedido
      - Geração de IDs únicos para evento e pedido
      - Publicação assíncrona na fila de pedidos
      - Processamento em lote otimizado
      
      **Processamento:**
      - O evento é adicionado à fila \`order.events\`
      - Processamento em lotes de até 25 pedidos
      - Retry automático em caso de falha
      - Auditoria completa do processo
    `
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Evento de pedido criado e publicado com sucesso',
    type: OrderEventResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados de entrada inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['quantity must be a positive number'],
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Erro interno do servidor' 
  })
  @ApiBody({ 
    type: CreateOrderEventDto,
    description: 'Dados do pedido a ser processado',
    examples: {
      'pedido-simples': {
        summary: 'Pedido com um item',
        value: {
          customerId: 'customer_123',
          items: [
            {
              productId: 'prod_notebook_dell',
              quantity: 1,
              unitPrice: 299900
            }
          ],
          totalAmount: 299900
        }
      },
      'pedido-multiplos-itens': {
        summary: 'Pedido com múltiplos itens',
        value: {
          customerId: 'customer_456',
          items: [
            {
              productId: 'prod_mouse_logitech',
              quantity: 2,
              unitPrice: 4999
            },
            {
              productId: 'prod_teclado_mecanico',
              quantity: 1,
              unitPrice: 15999
            }
          ],
          totalAmount: 25997
        }
      }
    }
  })
  async createOrderEvent(@Body() dto: CreateOrderEventDto): Promise<OrderEventResponseDto> {
    const event: OrderCreatedEvent = {
      id: uuidv4(),
      type: EventType.ORDER_CREATED,
      timestamp: new Date(),
      version: 1,
      payload: {
        orderId: uuidv4(),
        customerId: dto.customerId,
        items: dto.items,
        totalAmount: dto.totalAmount,
      },
    };

    await this.eventProcessorService.publishOrderEvent(event);

    return {
      message: 'Order event published successfully',
      eventId: event.id,
      orderId: event.payload.orderId,
    };
  }

  @Post('notifications')
  @ApiOperation({ 
    summary: 'Criar e publicar evento de notificação',
    description: `
      Cria um novo evento de notificação e o publica no RabbitMQ para processamento assíncrono.
      
      **Canais Suportados:**
      - **EMAIL**: Notificações por e-mail com suporte a HTML
      - **SMS**: Mensagens de texto curtas
      - **PUSH**: Notificações push para dispositivos móveis
      
      **Processamento:**
      - Processamento em lotes de até 100 notificações
      - Otimização por canal de envio
      - Retry automático com backoff exponencial
      - Rate limiting por canal
    `
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Evento de notificação criado e publicado com sucesso',
    type: NotificationEventResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados de entrada inválidos' 
  })
  @ApiBody({ 
    type: CreateNotificationEventDto,
    description: 'Dados da notificação a ser enviada',
    examples: {
      'email-boas-vindas': {
        summary: 'E-mail de boas-vindas',
        value: {
          recipientId: 'user_123456',
          channel: 'EMAIL',
          templateId: 'welcome_email',
          subject: 'Bem-vindo à nossa plataforma!',
          content: 'Olá! Seja bem-vindo. Esperamos que tenha uma ótima experiência.',
          metadata: {
            priority: 'high',
            category: 'onboarding'
          }
        }
      },
      'sms-confirmacao': {
        summary: 'SMS de confirmação',
        value: {
          recipientId: 'user_789012',
          channel: 'SMS',
          templateId: 'order_confirmation',
          content: 'Seu pedido #12345 foi confirmado e será entregue em 2 dias úteis.',
          metadata: {
            orderId: '12345'
          }
        }
      },
      'push-promocao': {
        summary: 'Push de promoção',
        value: {
          recipientId: 'user_345678',
          channel: 'PUSH',
          templateId: 'promotion_alert',
          subject: 'Oferta Especial!',
          content: 'Aproveite 30% de desconto em todos os produtos até meia-noite!',
          metadata: {
            campaignId: 'summer_sale_2024',
            discount: 30
          }
        }
      }
    }
  })
  async createNotificationEvent(@Body() dto: CreateNotificationEventDto): Promise<NotificationEventResponseDto> {
    const event: NotificationRequestedEvent = {
      id: uuidv4(),
      type: EventType.NOTIFICATION_REQUESTED,
      timestamp: new Date(),
      version: 1,
      payload: {
        recipientId: dto.recipientId,
        channel: dto.channel,
        templateId: dto.templateId,
        subject: dto.subject,
        content: dto.content,
        metadata: dto.metadata,
      },
    };

    await this.eventProcessorService.publishNotificationEvent(event);

    return {
      message: 'Notification event published successfully',
      eventId: event.id,
      channel: event.payload.channel,
    };
  }

  @Post('test/bulk-notifications/:count')
  @ApiOperation({ 
    summary: 'Criar eventos de notificação em lote para teste',
    description: `
      Cria múltiplos eventos de notificação para testar as capacidades de processamento em lote.
      
      **Uso:**
      - Ideal para testes de performance
      - Demonstra processamento em lote
      - Simula cenários de alta carga
      - Distribui eventos entre diferentes canais
      
      **Limitações:**
      - Máximo recomendado: 1000 eventos por chamada
      - Para testes maiores, use múltiplas chamadas
    `
  })
  @ApiParam({
    name: 'count',
    description: 'Número de eventos de notificação a serem criados',
    example: 100,
    type: 'number'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Eventos de notificação em lote criados com sucesso',
    type: BulkNotificationResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Parâmetro count inválido' 
  })
  async createBulkNotificationEvents(@Param('count') count: string): Promise<BulkNotificationResponseDto> {
    const eventCount = parseInt(count, 10);
    
    if (isNaN(eventCount) || eventCount <= 0 || eventCount > 1000) {
      throw new Error('Count must be a positive number between 1 and 1000');
    }

    const channels: NotificationChannel[] = [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH];
    const eventIds: string[] = [];

    for (let i = 0; i < eventCount; i++) {
      const event: NotificationRequestedEvent = {
        id: uuidv4(),
        type: EventType.NOTIFICATION_REQUESTED,
        timestamp: new Date(),
        version: 1,
        payload: {
          recipientId: `user_${Math.floor(Math.random() * 1000)}`,
          channel: channels[i % channels.length],
          templateId: 'test_template',
          subject: `Test Notification ${i + 1}`,
          content: `This is test notification number ${i + 1} for batch processing`,
          metadata: {
            batchTest: true,
            batchNumber: Math.floor(i / 50) + 1,
            testId: `bulk_test_${Date.now()}`,
          },
        },
      };

      await this.eventProcessorService.publishNotificationEvent(event);
      eventIds.push(event.id);
    }

    return {
      message: `${eventCount} notification events published for batch processing test`,
      eventIds: eventIds.slice(0, 10), // Return first 10 IDs
      totalEvents: eventCount,
    };
  }

  @Get('types')
  @ApiOperation({ 
    summary: 'Obter tipos de eventos suportados',
    description: `
      Retorna a lista completa de todos os tipos de eventos e canais de notificação 
      suportados pelo sistema.
      
      **Informações Retornadas:**
      - Tipos de eventos disponíveis para criação
      - Canais de notificação suportados
      - Útil para validação e interface de usuário
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de tipos de eventos e canais suportados',
    type: SupportedEventTypesDto
  })
  getSupportedEventTypes(): SupportedEventTypesDto {
    return {
      eventTypes: Object.values(EventType),
      notificationChannels: Object.values(NotificationChannel),
    };
  }
} 