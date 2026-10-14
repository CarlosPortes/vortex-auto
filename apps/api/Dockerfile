# =============================================================
# Vortex Auto - Backend API Dockerfile (Produção)
# Multi-stage build com Node.js 22 Alpine
# =============================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependências necessárias para o build
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

RUN npm ci

# Copiar código-fonte e configuração base do TypeScript
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build do pacote shared
RUN npm run build --workspace=@vortex/shared

# Build do backend API
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# =============================================================
# Estágio de Produção
# =============================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0

# Copiar arquivos de dependências
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Instalar apenas dependências de produção
RUN npm ci --omit=dev

# Copiar os artefatos compilados
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

WORKDIR /app/apps/api

EXPOSE 3333

# Usuário não-root para segurança (DOC-006)
USER node

CMD ["node", "dist/server.js"]
