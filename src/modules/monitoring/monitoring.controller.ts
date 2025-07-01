import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiParam } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { BatchProcessorService } from '../batch/services/batch-processor.service';
import { BatchJob } from '../../common/types/event.types';

// DTOs para documentação das respostas
class SystemStatusDto {
  @ApiProperty({
    description: 'Status geral do sistema',
    example: 'healthy',
    enum: ['healthy', 'degraded', 'unhealthy']
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp da verificação',
    example: '2025-07-01T13:29:54.933Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Tempo de atividade da aplicação em segundos',
    example: 33.5
  })
  uptime: number;

  @ApiProperty({
    description: 'Informações de uso de memória',
    example: {
      rss: 95,
      heapTotal: 36,
      heapUsed: 32,
      external: 3
    }
  })
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

class BatchStatisticsDto {
  @ApiProperty({
    description: 'Número de lotes pendentes',
    example: 2
  })
  pendingBatches: number;

  @ApiProperty({
    description: 'Número de lotes ativos sendo processados',
    example: 1
  })
  activeBatches: number;

  @ApiProperty({
    description: 'Total de eventos pendentes em todos os lotes',
    example: 75
  })
  totalPendingEvents: number;

  @ApiProperty({
    description: 'Distribuição de lotes por tipo de evento',
    example: {
      'ORDER_CREATED': 25,
      'NOTIFICATION_REQUESTED': 50
    }
  })
  batchesByType: Record<string, number>;
}

class BatchJobDto {
  @ApiProperty({
    description: 'ID único do lote',
    example: 'batch_6792410a-ac42-4f0c-a3fe'
  })
  id: string;

  @ApiProperty({
    description: 'Tipo de evento do lote',
    example: 'NOTIFICATION_REQUESTED'
  })
  type: string;

  @ApiProperty({
    description: 'Lista de eventos no lote',
    type: 'array',
    items: { type: 'object' }
  })
  events: any[];

  @ApiProperty({
    description: 'Número de eventos no lote',
    example: 50
  })
  batchSize: number;

  @ApiProperty({
    description: 'Status atual do processamento',
    example: 'PROCESSING',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']
  })
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  @ApiProperty({
    description: 'Timestamp de criação do lote',
    example: '2025-07-01T13:29:54.933Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp de início do processamento (opcional)',
    example: '2025-07-01T13:30:00.000Z',
    required: false
  })
  startedAt?: Date;

  @ApiProperty({
    description: 'Timestamp de conclusão do processamento (opcional)',
    example: '2025-07-01T13:30:30.000Z',
    required: false
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Mensagem de erro em caso de falha (opcional)',
    example: 'Connection timeout',
    required: false
  })
  error?: string;
}

class ApplicationMetricsDto {
  @ApiProperty({
    description: 'Métricas de memória da aplicação',
    example: {
      rss: 95,
      heapTotal: 36,
      heapUsed: 32,
      external: 3
    }
  })
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };

  @ApiProperty({
    description: 'Tempo de atividade em segundos',
    example: 51.870186229
  })
  uptime: number;

  @ApiProperty({
    description: 'Timestamp da coleta das métricas',
    example: 1751234567890
  })
  timestamp: number;
}

class BatchProcessingResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação',
    example: 'Batch processing triggered'
  })
  message: string;

  @ApiProperty({
    description: 'Tipo de evento processado ou "all" para todos',
    example: 'NOTIFICATION_REQUESTED'
  })
  eventType: string;
}

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly batchProcessorService: BatchProcessorService,
  ) {}

  @Get('status')
  @ApiOperation({ 
    summary: 'Obter status do sistema',
    description: `
      Retorna informações detalhadas sobre o status atual do sistema.
      
      **Informações incluídas:**
      - Status geral da aplicação (healthy/degraded/unhealthy)
      - Tempo de atividade da aplicação
      - Uso atual de memória
      - Timestamp da verificação
      
      **Status possíveis:**
      - **healthy**: Sistema funcionando normalmente
      - **degraded**: Sistema com problemas menores
      - **unhealthy**: Sistema com problemas críticos
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Informações de status do sistema',
    type: SystemStatusDto
  })
  getSystemStatus(): SystemStatusDto {
    return this.monitoringService.getSystemStatus();
  }

  @Get('batch/statistics')
  @ApiOperation({ 
    summary: 'Obter estatísticas de processamento em lote',
    description: `
      Retorna estatísticas detalhadas sobre o processamento em lote de eventos.
      
      **Métricas incluídas:**
      - Número de lotes pendentes aguardando processamento
      - Número de lotes ativos sendo processados
      - Total de eventos pendentes em todos os lotes
      - Distribuição de lotes por tipo de evento
      
      **Uso:**
      - Monitoramento de performance
      - Identificação de gargalos
      - Planejamento de capacidade
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estatísticas de processamento em lote',
    type: BatchStatisticsDto
  })
  getBatchStatistics(): BatchStatisticsDto {
    return this.batchProcessorService.getBatchStatistics();
  }

  @Get('batch/active')
  @ApiOperation({ 
    summary: 'Obter lotes ativos',
    description: `
      Retorna informações detalhadas sobre todos os lotes que estão 
      atualmente sendo processados.
      
      **Informações por lote:**
      - ID único do lote
      - Tipo de evento sendo processado
      - Lista completa de eventos no lote
      - Número de eventos no lote
      - Status atual do processamento
      - Timestamps de criação, início e conclusão
      
      **Estados possíveis:**
      - **PENDING**: Aguardando processamento
      - **PROCESSING**: Sendo processado
      - **COMPLETED**: Processamento concluído
      - **FAILED**: Processamento falhou
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de lotes ativos',
    type: [BatchJobDto]
  })
  getActiveBatches(): BatchJob[] {
    return this.batchProcessorService.getActiveBatches();
  }

  @Post('batch/force/:eventType?')
  @ApiOperation({ 
    summary: 'Forçar processamento de lotes',
    description: `
      Força o processamento imediato de lotes pendentes, ignorando 
      os timeouts configurados.
      
      **Parâmetros:**
      - **eventType** (opcional): Tipo específico de evento para processar
      - Se não especificado, processa todos os tipos de eventos
      
      **Casos de uso:**
      - Processamento urgente de eventos críticos
      - Manutenção e limpeza de filas
      - Testes de performance
      - Resolução de gargalos
      
      **Cuidados:**
      - Use com moderação para evitar sobrecarga
      - Pode impactar a performance geral do sistema
    `
  })
  @ApiParam({
    name: 'eventType',
    description: 'Tipo específico de evento para forçar processamento (opcional)',
    example: 'NOTIFICATION_REQUESTED',
    required: false,
    enum: ['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'STOCK_UPDATED', 'STOCK_RESERVED', 'NOTIFICATION_REQUESTED']
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Processamento em lote iniciado com sucesso',
    type: BatchProcessingResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Tipo de evento inválido' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Erro interno durante o processamento' 
  })
  async forceBatchProcessing(@Param('eventType') eventType?: string): Promise<BatchProcessingResponseDto> {
    await this.batchProcessorService.forceBatchProcessing(eventType as any);
    return { 
      message: 'Batch processing triggered', 
      eventType: eventType || 'all' 
    };
  }

  @Get('metrics')
  @ApiOperation({ 
    summary: 'Obter métricas da aplicação',
    description: `
      Retorna métricas detalhadas sobre o desempenho e uso de recursos 
      da aplicação.
      
      **Métricas incluídas:**
      - **Memória**: RSS, heap total, heap usado, memória externa
      - **Tempo de atividade**: Segundos desde o último restart
      - **Timestamp**: Momento da coleta das métricas
      
      **Definições:**
      - **RSS**: Resident Set Size - memória física usada
      - **Heap Total**: Total de memória heap alocada
      - **Heap Used**: Memória heap atualmente em uso
      - **External**: Memória usada por objetos C++ vinculados ao JS
      
      **Uso:**
      - Monitoramento de performance
      - Detecção de vazamentos de memória
      - Planejamento de recursos
      - Alertas de capacidade
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Métricas da aplicação',
    type: ApplicationMetricsDto
  })
  getMetrics(): ApplicationMetricsDto {
    return this.monitoringService.getMetrics();
  }
} 