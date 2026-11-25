import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { authRoutes } from './routes/auth.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { clientesRoutes } from './routes/clientes.routes.js';
import { veiculosRoutes } from './routes/veiculos.routes.js';
import { atendimentosRoutes } from './routes/atendimentos.routes.js';
import { orcamentosRoutes } from './routes/orcamentos.routes.js';
import { produtosRoutes } from './routes/produtos.routes.js';
import { osRoutes } from './routes/os.routes.js';
import { inspecoesRoutes } from './routes/inspecoes.routes.js';
import { financeiroRoutes } from './routes/financeiro.routes.js';
import { complementosRoutes } from './routes/complementos.routes.js';
import { comprasRoutes } from './routes/compras.routes.js';
import { vendasBalcaoRoutes } from './routes/vendas-balcao.routes.js';
import { prisma } from './prisma.js';

dotenv.config();

const app = Fastify({
  logger: process.env.NODE_ENV === 'development',
  bodyLimit: 15 * 1024 * 1024, // 15MB para suportar upload de fotos de antes/durante/depois da OS
});

async function garantirSchemaAtualizado() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS plano_assinatura TEXT NOT NULL DEFAULT 'BASICO';
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS com_fotos BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS servicos_catalogo (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        codigo TEXT NOT NULL,
        nome TEXT NOT NULL,
        categoria TEXT NOT NULL DEFAULT 'MECANICA_GERAL',
        valor_sugerido NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
        tempo_estimado_minutos INTEGER NOT NULL DEFAULT 30,
        descricao_padrao TEXT,
        ativo BOOLEAN NOT NULL DEFAULT true,
        criado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         UNIQUE (empresa_id, codigo)
      );
      CREATE INDEX IF NOT EXISTS servicos_catalogo_empresa_id_categoria_idx ON servicos_catalogo(empresa_id, categoria);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS fotos_os (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        ordem_servico_id TEXT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
        etapa TEXT NOT NULL DEFAULT 'ANTES',
        legenda TEXT NOT NULL,
        url TEXT NOT NULL,
        criado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS fotos_os_empresa_id_ordem_servico_id_idx ON fotos_os(empresa_id, ordem_servico_id);
    `);
  } catch (err) {
    console.warn('⚠️ [Schema Sync] Aviso ao sincronizar tabelas adicionais:', err);
  }
}

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

// Hardening de Segurança (DOC-006): Proteção contra brute-force e cabeçalhos HTTP
await app.register(helmet, {
  contentSecurityPolicy: false,
});

await app.register(rateLimit, {
  max: 1000,
  timeWindow: '1 minute',
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
    versao: '1.0.0',
    ambiente: process.env.NODE_ENV || 'production',
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
await app.register(produtosRoutes, { prefix: '/api/produtos' });
await app.register(osRoutes, { prefix: '/api/os' });
await app.register(inspecoesRoutes, { prefix: '/api' });
await app.register(financeiroRoutes, { prefix: '/api' });
await app.register(complementosRoutes, { prefix: '/api' });
await app.register(comprasRoutes, { prefix: '/api/compras' });
await app.register(vendasBalcaoRoutes, { prefix: '/api/vendas-balcao' });

// Inicialização do Servidor
const PORT = Number(process.env.PORT) || 3333;
const HOST = process.env.HOST || '0.0.0.0';

try {
  await garantirSchemaAtualizado();
  await app.listen({ port: PORT, host: HOST });
  console.log(`🚀 [Vortex Auto API] Servidor rodando em http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
