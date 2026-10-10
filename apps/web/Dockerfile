# =============================================================
# Vortex Auto - Frontend Web Dockerfile (Produção)
# Multi-stage build com Node.js 22 e Nginx Alpine
# =============================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/

RUN npm ci

# Copiar fontes
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build dos pacotes
RUN npm run build --workspace=@vortex/shared
RUN npm run build --workspace=@vortex/web

# =============================================================
# Estágio Nginx Runner
# =============================================================
FROM nginx:alpine AS runner

# Copiar configuração do Nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar os artefatos estáticos gerados pelo Vite
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
