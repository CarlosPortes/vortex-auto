import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { authRoutes } from './routes/auth.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { clientesRoutes } from './routes/clientes.routes.js';
import { veiculosRoutes } from './routes/veiculos.routes.js';
import { atendimentosRoutes } from './routes/atendimentos.routes.js';
import { orcamentosRoutes } from './routes/orcamentos.routes.js';

dotenv.config();

const app = Fastify({
  logger: process.env.NODE_ENV === 'development',
});

// Registrar CORS
await app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

// Registrar JWT
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'vortex_auto_default_dev_secret_key_2026',
});

// Hook para gerar ID de correlação para rastreabilidade (DOC-006, DOC-013)
app.addHook('onRequest', async (request, reply) => {
  const correlacaoId = (request.headers['x-correlation-id'] as string) || randomUUID();
  request.correlacaoId = correlacaoId;
  reply.header('x-correlation-id', correlacaoId);
});

// Health check
app.get('/api/health', async () => {
  return {
    status: 'online',
    aplicacao: 'Vortex Auto API',
    versao: '0.3.0',
    timestamp: new Date().toISOString(),
  };
});

// Registrar Módulos de Rotas
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(adminRoutes, { prefix: '/api/admin' });
await app.register(clientesRoutes, { prefix: '/api/clientes' });
await app.register(veiculosRoutes, { prefix: '/api/veiculos' });
await app.register(atendimentosRoutes, { prefix: '/api/atendimentos' });
await app.register(orcamentosRoutes, { prefix: '/api' });

// Inicialização do Servidor
const PORT = Number(process.env.PORT) || 3333;
const HOST = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`🚀 [Vortex Auto API] Servidor rodando em http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
