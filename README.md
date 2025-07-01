# 🚀 Sistema de Processamento de Eventos em Tempo Real - E-commerce

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Contexto Funcional](#-contexto-funcional)
- [Arquitetura da Solução](#️-arquitetura-da-solução)
- [Design Patterns Implementados](#-design-patterns-implementados)
- [Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [Configuração e Execução](#-configuração-e-execução)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API Endpoints](#-api-endpoints)
- [Documentação Swagger](#-documentação-swagger)
- [Monitoramento](#-monitoramento)
- [Testes](#-testes)
- [Considerações de Produção](#️-considerações-de-produção)

## 🎯 Visão Geral

Este projeto implementa um **sistema robusto de processamento de eventos em tempo real** para uma plataforma de e-commerce, combinando processamento assíncrono com RabbitMQ e processamento em lote para otimização de performance.

### ✨ Principais Características

- ✅ **Processamento Assíncrono**: RabbitMQ para eventos críticos em tempo real
- ✅ **Processamento em Lote**: Otimização para operações de alto volume
- ✅ **Design Patterns**: Strategy, Observer e Factory implementados
- ✅ **Retry & DLQ**: Sistema completo de recuperação de falhas
- ✅ **Dockerização**: Ambiente completo com Docker Compose
- ✅ **Monitoramento**: APIs para observabilidade do sistema
- ✅ **Documentação Swagger**: Interface interativa completa
- ✅ **Validação Robusta**: DTOs com validações detalhadas
- ✅ **Logging Estruturado**: Winston com múltiplos transports

## 🏪 Contexto Funcional

### Cenário: Gestão de Pedidos e Notificações E-commerce

O sistema processa eventos relacionados a:

1. **📦 Eventos de Pedidos**: Criação, atualização e cancelamento de pedidos
2. **💳 Eventos de Pagamento**: Confirmações e falhas de pagamento
3. **📦 Eventos de Estoque**: Atualizações e reservas de produtos
4. **📢 Eventos de Notificação**: Emails, SMS e push notifications

### 🤔 Justificativa RabbitMQ + Batch Processing

- **RabbitMQ**: Eventos críticos como confirmação de pagamento precisam ser processados imediatamente
- **Batch Processing**: Notificações podem ser agrupadas para otimizar APIs de terceiros (ex: envio de emails em massa)
- **Híbrido**: Flexibilidade para escolher a melhor estratégia por tipo de evento

## 🏗️ Arquitetura da Solução

### Componentes Principais

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   REST API      │    │   RabbitMQ      │    │   PostgreSQL    │
│   (NestJS)      │◄──►│   (Message      │    │   (Database)    │
│   + Swagger     │    │    Broker)      │    │   + TypeORM     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Event Processor │    │ Batch Processor │    │ Audit System    │
│   (Strategy)    │    │   (Scheduler)   │    │  (Observer)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitoring    │    │   Health Check  │    │    Logging      │
│   (Metrics)     │    │   (Status)      │    │   (Winston)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🔄 Fluxo de Processamento

1. **📥 Entrada**: API REST recebe requisições para criar eventos
2. **📤 Publicação**: Eventos são publicados no RabbitMQ com routing apropriado
3. **🔄 Consumo**: Consumers específicos processam eventos por tipo
4. **🎯 Estratégia**: Strategy Pattern direciona para processador específico
5. **⚡ Batch/Imediato**: Eventos suportam batch ou processamento imediato
6. **👁️ Observação**: Observer Pattern notifica sistemas de auditoria
7. **💾 Persistência**: Dados processados são salvos no PostgreSQL
8. **📊 Monitoramento**: Métricas e logs são coletados continuamente

## 🎨 Design Patterns Implementados

### 1. 🎯 Strategy Pattern
**Localização**: `src/common/strategies/event-processor.strategy.ts`

**Propósito**: Diferentes estratégias de processamento para cada tipo de evento

**Implementação**:
- `OrderProcessorStrategy`: Processa eventos de pedidos com validação de negócio
- `NotificationProcessorStrategy`: Processa notificações com suporte a batch
- `PaymentProcessorStrategy`: Processa eventos de pagamento críticos

**Benefícios**:
- 🔧 **Extensibilidade**: Fácil adição de novos tipos de eventos
- 🛠️ **Manutenibilidade**: Lógica específica isolada em estratégias
- ✅ **Testabilidade**: Cada estratégia pode ser testada independentemente

```typescript
// Exemplo de uso
const processor = processorFactory.createProcessor(EventType.ORDER_CREATED);
if (processor?.supportsBatchProcessing()) {
  await batchProcessor.addEventToBatch(event);
} else {
  await processor.process(event);
}
```

### 2. 👁️ Observer Pattern
**Localização**: `src/common/observers/event-observer.pattern.ts`

**Propósito**: Notificar múltiplos subsistemas quando eventos são processados

**Implementação**:
- `AuditObserver`: Registra todos os eventos para auditoria e compliance
- `MetricsObserver`: Coleta métricas de performance e uso
- `EventSubject`: Gerencia observadores e notificações

**Benefícios**:
- 🔗 **Desacoplamento**: Observadores independentes uns dos outros
- 🔄 **Flexibilidade**: Fácil adição/remoção de observadores
- 🛡️ **Resilência**: Falha de um observador não afeta outros

```typescript
// Exemplo de uso
eventSubject.attach(auditObserver);
eventSubject.attach(metricsObserver);
await eventSubject.notify(event); // Notifica todos observadores interessados
```

### 3. 🏭 Factory Pattern
**Localização**: `src/common/factories/event-processor.factory.ts`

**Propósito**: Criar processadores específicos baseado no tipo de evento

**Implementação**:
- Registry interno mapeia tipos de eventos para processadores
- Inicialização automática baseada em processadores disponíveis
- Suporte a configuração dinâmica de processadores

**Benefícios**:
- 🎭 **Abstração**: Cliente não precisa conhecer implementações específicas
- 🎯 **Centralização**: Lógica de criação centralizada
- ⚙️ **Configurabilidade**: Fácil configuração de mapeamentos

## 🛠️ Tecnologias Utilizadas

### 🚀 Core
- **NestJS 10+**: Framework Node.js para APIs robustas e escaláveis
- **TypeScript 5+**: Type safety e desenvolvimento produtivo
- **RabbitMQ**: Message broker para processamento assíncrono
- **PostgreSQL 15+**: Banco de dados relacional com performance otimizada
- **TypeORM**: ORM moderno para TypeScript/JavaScript

### 🏗️ Infraestrutura
- **Docker & Docker Compose**: Containerização e orquestração
- **Winston**: Sistema de logging estruturado com múltiplos transports
- **Jest**: Framework de testes com coverage
- **Swagger/OpenAPI**: Documentação automática e interativa da API

### 📚 Bibliotecas Específicas
- `@nestjs/swagger`: Documentação automática com OpenAPI 3.0
- `@nestjs/schedule`: Jobs agendados (Cron) para processamento em lote
- `@nestjs/config`: Gerenciamento seguro de configurações
- `class-validator`: Validação robusta de DTOs
- `class-transformer`: Transformação de dados
- `uuid`: Geração de identificadores únicos
- `amqplib`: Cliente RabbitMQ nativo para máxima performance

## 🚀 Configuração e Execução

### 📋 Pré-requisitos
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (para desenvolvimento local)
- Git

### 🐳 Execução com Docker (Recomendado)

1. **Clone o repositório**:
```bash
git clone <repository-url>
cd ecommerce-event-processor
```

2. **Execute com Docker Compose**:
```bash
docker-compose up --build -d
```

3. **Verifique os serviços**:
- **🌐 API**: http://localhost:3000
- **📚 Swagger**: http://localhost:3000/api
- **🐰 RabbitMQ Management**: http://localhost:15672 (user: rabbitmq, pass: rabbitmq)
- **❤️ Health Check**: http://localhost:3000/health
- **📊 Status**: http://localhost:3000/monitoring/status

### 💻 Desenvolvimento Local

1. **Instale dependências**:
```bash
npm install
```

2. **Configure variáveis de ambiente**:
```bash
cp .env.example .env
# Edite .env com suas configurações
```

3. **Execute serviços de infraestrutura**:
```bash
docker-compose up postgres rabbitmq -d
```

4. **Execute a aplicação**:
```bash
npm run start:dev
```

### ⚙️ Variáveis de Ambiente

| Variável | Descrição | Padrão | Obrigatório |
|----------|-----------|---------|-------------|
| `PORT` | Porta da aplicação | 3000 | ❌ |
| `NODE_ENV` | Ambiente de execução | development | ❌ |
| `LOG_LEVEL` | Nível de log | info | ❌ |
| `DB_HOST` | Host do PostgreSQL | postgres | ✅ |
| `DB_PORT` | Porta do PostgreSQL | 5432 | ❌ |
| `DB_USERNAME` | Usuário do banco | postgres | ✅ |
| `DB_PASSWORD` | Senha do banco | postgres | ✅ |
| `DB_NAME` | Nome do banco | ecommerce_events | ✅ |
| `RABBITMQ_URL` | URL de conexão RabbitMQ | amqp://rabbitmq:rabbitmq@rabbitmq:5672 | ✅ |
| `BATCH_SIZE` | Tamanho padrão dos lotes | 50 | ❌ |
| `BATCH_TIMEOUT` | Timeout dos lotes (ms) | 30000 | ❌ |
| `MAX_RETRY_ATTEMPTS` | Tentativas máximas | 3 | ❌ |
| `RETRY_DELAY` | Delay entre tentativas (ms) | 5000 | ❌ |
| `RETRY_BACKOFF_FACTOR` | Fator de backoff | 2 | ❌ |

## 📁 Estrutura do Projeto

```
src/
├── 🔧 common/                     # Código compartilhado
│   ├── entities/                  # Entidades TypeORM
│   ├── factories/                 # Factory Pattern
│   ├── observers/                 # Observer Pattern
│   ├── strategies/                # Strategy Pattern  
│   └── types/                     # Tipos e interfaces
├── ⚙️ config/                     # Configurações da aplicação
├── 📦 modules/                    # Módulos funcionais
│   ├── audit/                     # Sistema de auditoria
│   ├── batch/                     # Processamento em lote
│   │   ├── services/              # Serviços de batch
│   │   └── schedulers/            # Agendadores cron
│   ├── event-processor/           # Processador principal
│   │   ├── event.controller.ts    # Controller com Swagger
│   │   └── event-processor.service.ts
│   ├── monitoring/                # Monitoramento
│   │   ├── monitoring.controller.ts
│   │   └── monitoring.service.ts
│   ├── notification/              # Processamento de notificações
│   └── order/                     # Processamento de pedidos
├── 🏠 app.module.ts               # Módulo principal
└── 🚀 main.ts                     # Ponto de entrada com Swagger
```

## 🔗 API Endpoints

### 📦 Eventos

#### **POST** `/events/orders`
**Descrição**: Cria e publica evento de pedido para processamento assíncrono

**Body**:
```json
{
  "customerId": "customer_123",
  "items": [
    {
      "productId": "prod_notebook_dell",
      "quantity": 1,
      "unitPrice": 299900
    }
  ],
  "totalAmount": 299900
}
```

**Response**:
```json
{
  "message": "Order event published successfully",
  "eventId": "evt_6792410a-ac42-4f0c-a3fe-89c930ff4688",
  "orderId": "order_32576a75-dbe5-4724-a3e6-0ac96a195176"
}
```

#### **POST** `/events/notifications`
**Descrição**: Cria e publica evento de notificação com suporte a múltiplos canais

**Body**:
```json
{
  "recipientId": "user_123456",
  "channel": "EMAIL",
  "templateId": "welcome_email",
  "subject": "Bem-vindo à nossa plataforma!",
  "content": "Olá! Seja bem-vindo. Esperamos que tenha uma ótima experiência.",
  "metadata": {
    "priority": "high",
    "category": "onboarding"
  }
}
```

#### **POST** `/events/test/bulk-notifications/:count`
**Descrição**: Cria múltiplos eventos para teste de batch processing
- **Parâmetro**: `count` (1-1000)
- **Uso**: Testes de performance e demonstração

#### **GET** `/events/types`
**Descrição**: Lista todos os tipos de eventos e canais suportados

**Response**:
```json
{
  "eventTypes": [
    "ORDER_CREATED", "ORDER_UPDATED", "ORDER_CANCELLED",
    "PAYMENT_CONFIRMED", "PAYMENT_FAILED",
    "STOCK_UPDATED", "STOCK_RESERVED",
    "NOTIFICATION_REQUESTED"
  ],
  "notificationChannels": ["EMAIL", "SMS", "PUSH"]
}
```

### 📊 Monitoramento

#### **GET** `/monitoring/status`
**Descrição**: Status geral do sistema com métricas de saúde

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-01T13:29:54.933Z",
  "uptime": 33.5,
  "memoryUsage": {
    "rss": 95,
    "heapTotal": 36,
    "heapUsed": 32,
    "external": 3
  }
}
```

#### **GET** `/monitoring/batch/statistics`
**Descrição**: Estatísticas detalhadas de processamento em lote

**Response**:
```json
{
  "pendingBatches": 2,
  "activeBatches": 1,
  "totalPendingEvents": 75,
  "batchesByType": {
    "ORDER_CREATED": 25,
    "NOTIFICATION_REQUESTED": 50
  }
}
```

#### **GET** `/monitoring/batch/active`
**Descrição**: Lista todos os lotes ativos em processamento

#### **POST** `/monitoring/batch/force/:eventType?`
**Descrição**: Força processamento imediato de lotes pendentes
- **Parâmetro**: `eventType` (opcional) - tipo específico para processar

#### **GET** `/monitoring/metrics`
**Descrição**: Métricas detalhadas da aplicação (memória, uptime, etc.)

#### **GET** `/health`
**Descrição**: Health check com informações de serviços

## 📚 Documentação Swagger

### 🎯 Funcionalidades da Documentação

A documentação Swagger foi completamente redesenhada com:

#### 📖 **Interface Melhorada**
- **Navegação intuitiva** com filtros de busca
- **Expansão configurável** de seções
- **Try it out** habilitado para todos os endpoints
- **CSS customizado** para melhor UX
- **Persistência de autorização** entre sessões

#### 💡 **Exemplos Práticos**
- **Múltiplos exemplos** por endpoint (pedido simples, múltiplos itens)
- **Cenários reais** de uso da API
- **Dados de teste** válidos e realistas
- **Respostas esperadas** documentadas
- **Códigos de erro** com explicações detalhadas

#### 🎨 **Customizações**
- **Título personalizado**: "E-commerce Event Processor API"
- **Descrição rica** com markdown e emojis
- **Tags organizadas** por funcionalidade
- **Servidores múltiplos** (desenvolvimento e produção)
- **Informações de contato** e licença

#### 🔧 **Validações Documentadas**
- **DTOs detalhados** com validações específicas
- **Tipos de dados** claramente definidos
- **Exemplos de entrada** e saída
- **Códigos de status** HTTP explicados

### 📍 **Acesso**
- **URL**: http://localhost:3000/api
- **Recursos**: Documentação interativa completa
- **Testes**: Execute requests diretamente na interface

## 📊 Monitoramento

### 🏥 Health Checks
- **Endpoint**: `/health`
- **Verificações**: Database, RabbitMQ, Memória
- **Formato**: JSON estruturado com timestamps
- **Automatização**: Pronto para integração com Kubernetes

### 📝 Logs
- **Console**: Logs coloridos para desenvolvimento
- **Arquivos**: 
  - `logs/combined.log`: Todos os logs
  - `logs/error.log`: Apenas erros
- **Formato**: JSON estruturado para produção
- **Níveis**: error, warn, info, debug
- **Rotacionamento**: Configurável por tamanho/data

### 📈 Métricas
- **Uso de memória**: RSS, heap total, heap usado
- **Uptime**: Tempo de atividade da aplicação
- **Batch statistics**: Lotes pendentes, ativos, por tipo
- **Event counters**: Eventos processados por tipo
- **Performance**: Tempo de processamento por evento

### 🔍 Observabilidade
- **Structured logging**: Winston com contexto
- **Request tracking**: IDs únicos para rastreamento
- **Error tracking**: Stack traces estruturados
- **Metrics collection**: Prontos para Prometheus

## 🧪 Testes

### 🚀 Executar Testes
```bash
# Todos os testes
npm run test

# Testes com coverage
npm run test:cov

# Testes em modo watch
npm run test:watch

# Testes end-to-end
npm run test:e2e
```

### 📊 Cobertura
- **Strategy Pattern**: ✅ Testado com mocks e cenários de erro
- **Observer Pattern**: ✅ Testado com múltiplos observadores
- **Processamento de eventos**: ✅ Testes unitários e de integração
- **Retry logic**: ✅ Testes de cenários de falha
- **API endpoints**: ✅ Testes de validação e responses
- **Batch processing**: ✅ Testes de agrupamento e timeouts

### 🎯 Tipos de Teste
- **Unit Tests**: Lógica de negócio isolada
- **Integration Tests**: Interação entre componentes
- **E2E Tests**: Fluxos completos da API
- **Performance Tests**: Carga e stress testing

## 🏗️ Considerações de Produção

### 📈 Escalabilidade

#### 1. **Horizontal Scaling**
- ✅ **Múltiplas instâncias** da aplicação
- ✅ **Stateless design** para fácil replicação
- 🔄 **Load balancer** na frente das instâncias
- 🐰 **RabbitMQ cluster** para alta disponibilidade
- 📊 **Auto-scaling** baseado em métricas

#### 2. **Database Scaling**
- 📖 **Read replicas** para queries de leitura
- 🏊 **Connection pooling** otimizado
- 📇 **Índices apropriados** (já implementados)
- 🗂️ **Particionamento** de tabelas grandes
- 💾 **Caching layer** com Redis

### 🛡️ Resiliência

#### 1. **Fault Tolerance**
- ⚡ **Circuit Breaker**: Implementar para dependências externas
- 🚦 **Rate Limiting**: Proteger APIs contra sobrecarga
- 💀 **Dead Letter Queue**: ✅ Já implementado para eventos falhos
- 🔄 **Retry Logic**: ✅ Backoff exponencial implementado

#### 2. **Monitoring Avançado**
- 📊 **Prometheus + Grafana** para métricas avançadas
- 🚨 **Alerting**: PagerDuty ou similar
- 📈 **APM**: New Relic ou Datadog
- 🔍 **Distributed Tracing**: Jaeger para rastreamento

### 🔒 Segurança

#### 1. **Authentication & Authorization**
- 🔑 **JWT tokens** para APIs (preparado no Swagger)
- 👥 **RBAC** para diferentes operações
- 🔐 **API Keys** para sistemas externos
- 🛡️ **Rate limiting** por usuário/IP

#### 2. **Infrastructure Security**
- 🔒 **TLS/SSL** para comunicação RabbitMQ
- 🗝️ **Secrets Management**: HashiCorp Vault ou AWS Secrets
- 🔐 **Database encryption** at rest
- 🌐 **Network segmentation** com VPCs

### 🏗️ Microserviços

Esta solução se encaixa perfeitamente em uma arquitetura de microserviços:

#### **Event-Driven Architecture**
- 📡 **Event Store**: Centralize eventos para event sourcing
- 🔄 **CQRS**: Separação de comandos e queries
- 📬 **Event Bus**: RabbitMQ como backbone de comunicação

#### **Service Mesh**
- 🗺️ **Service Discovery**: Consul ou Eureka
- 🚪 **API Gateway**: Kong ou Zuul para roteamento
- 🔍 **Distributed Tracing**: Jaeger para rastreamento
- 🛡️ **Security Policies**: Istio para políticas de rede

### ⚡ Performance

#### 1. **Application Level**
- 🏊 **Connection Pooling**: ✅ Já configurado para PostgreSQL
- 📬 **Message Prefetch**: Configurar no RabbitMQ
- 📦 **Batch Size**: ✅ Tuneable via configuração
- 💾 **Caching**: Redis para dados frequentes

#### 2. **Infrastructure Level**
- 🚀 **CDN**: Para assets estáticos
- 🗜️ **Compression**: Gzip/Brotli para responses
- 📊 **Database tuning**: Query optimization
- 🔄 **Load balancing**: Algoritmos otimizados

---

## 🎉 Funcionalidades Destacadas

### ✨ **Implementações Técnicas**
- ✅ **3 Design Patterns** implementados e justificados
- ✅ **Processamento em Lote** inteligente com timeout configurável
- ✅ **Retry com Backoff Exponencial** para recuperação de falhas
- ✅ **Dead Letter Queue** para eventos falhos
- ✅ **Observabilidade** completa com logs estruturados e métricas
- ✅ **Dockerização** otimizada com multi-stage build
- ✅ **Testes Unitários** com boa cobertura
- ✅ **Validação Robusta** com class-validator

### 🎯 **Experiência do Desenvolvedor**
- ✅ **Documentação Swagger** interativa e detalhada
- ✅ **API REST** intuitiva para injeção e monitoramento
- ✅ **TypeScript** com tipagem forte
- ✅ **Hot reload** para desenvolvimento
- ✅ **Logs estruturados** para debugging
- ✅ **Health checks** para diagnóstico

### 🚀 **Produção Ready**
- ✅ **Configuração por ambiente** via .env
- ✅ **Graceful shutdown** implementado
- ✅ **Error handling** robusto
- ✅ **Security headers** configurados
- ✅ **CORS** configurável
- ✅ **Rate limiting** preparado

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Suporte

- **📧 Email**: dev@empresa.com
- **🐛 Issues**: [GitHub Issues](https://github.com/seu-usuario/ecommerce-event-processor/issues)
- **📚 Documentação**: [Wiki do Projeto](https://github.com/seu-usuario/ecommerce-event-processor/wiki)

---

**Este sistema demonstra como combinar tecnologias modernas com padrões de design sólidos para criar uma solução robusta, escalável e maintível para processamento de eventos em tempo real.** 🚀 