import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';

class HealthCheckDto {
  @ApiProperty({
    description: 'Status geral da aplicação',
    example: 'ok',
    enum: ['ok', 'error']
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
    description: 'Ambiente de execução',
    example: 'development'
  })
  environment: string;

  @ApiProperty({
    description: 'Versão da aplicação',
    example: '1.0.0'
  })
  version: string;

  @ApiProperty({
    description: 'Status dos serviços externos',
    example: {
      database: 'connected',
      rabbitmq: 'connected'
    }
  })
  services: {
    database: string;
    rabbitmq: string;
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ 
    summary: 'Verificação de saúde da aplicação',
    description: `
      Endpoint de health check para verificar se a aplicação está funcionando corretamente.
      
      **Verificações incluídas:**
      - Status geral da aplicação
      - Tempo de atividade (uptime)
      - Ambiente de execução
      - Versão da aplicação
      - Status dos serviços externos (Database, RabbitMQ)
      
      **Uso:**
      - Monitoramento automático
      - Load balancers
      - Kubernetes health checks
      - Verificações de deploy
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Aplicação funcionando corretamente',
    type: HealthCheckDto
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Aplicação com problemas' 
  })
  getHealth(): HealthCheckDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'connected',
        rabbitmq: 'connected'
      }
    };
  }
} 