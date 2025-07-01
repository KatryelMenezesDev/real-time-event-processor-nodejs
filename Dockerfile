# Multi-stage build para otimizar o tamanho da imagem
FROM node:18-alpine AS builder

# Instalar dependências necessárias
RUN apk add --no-cache libc6-compat

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instalar todas as dependências (incluindo dev para build)
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copiar código fonte
COPY src ./src

# Build da aplicação
RUN npm run build

# Estágio de produção
FROM node:18-alpine AS production

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json para instalar apenas dependências de produção
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Copiar arquivos necessários do estágio de build
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Criar diretório de logs
RUN mkdir -p logs && chown nestjs:nodejs logs

# Definir usuário
USER nestjs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js

# Comando para iniciar a aplicação
CMD ["node", "dist/main.js"] 