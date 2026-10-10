import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma.js';
import {
  PlanejarOSSchema,
  ApontarAtividadeSchema,
  ConsumirMaterialOSSchema,
  PermissaoAcesso,
  StatusOS,
  StatusAtividade,
  StatusAtendimento,
  TipoMovimentoEstoque,
  TipoOperacaoAuditoria,
} from '@vortex/shared';
import { tenantMiddleware, exigirPermissao } from '../middlewares/tenant.middleware.js';
import { AuditoriaService } from '../services/auditoria.service.js';

export async function osRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => req.jwtVerify());
  app.addHook('onRequest', tenantMiddleware);

  /**
   * GET /api/os
   * Listar Ordens de Serviço do tenant com filtros de status e busca (HU-014)
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { status, q } = request.query as { status?: string; q?: string };

    const where: any = {
      empresaId: tenant.empresaId,
    };

    if (status) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { codigoFormatado: { contains: q, mode: 'insensitive' } },
        { atendimento: { codigoFormatado: { contains: q, mode: 'insensitive' } } },
        { atendimento: { veiculo: { placa: { contains: q, mode: 'insensitive' } } } },
        { atendimento: { cliente: { nomeRazao: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const ordens = await prisma.ordemServico.findMany({
      where,
      include: {
        responsavelMecanico: { select: { id: true, nome: true, email: true } },
        atendimento: {
          select: {
            id: true,
            codigoFormatado: true,
            status: true,
            queixaPrincipal: true,
            cliente: { select: { id: true, nomeRazao: true, telefone: true } },
            veiculo: { select: { id: true, placa: true, modelo: true, marca: true } },
          },
        },
        atividades: {
          select: {
            id: true,
            descricao: true,
            status: true,
            tempoEstimadoMinutos: true,
            tempoRealizadoMinutos: true,
            mecanico: { select: { id: true, nome: true } },
          },
          orderBy: { criadoEm: 'asc' },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    const formatadas = ordens.map((os) => {
      const totalAtividades = os.atividades.length;
      const concluidas = os.atividades.filter((a) => a.status === StatusAtividade.CONCLUIDA).length;
      const progressoPercent = totalAtividades > 0 ? Math.round((concluidas / totalAtividades) * 100) : 0;

      return {
        id: os.id,
        numeroOS: os.numeroOS,
        codigoFormatado: os.codigoFormatado,
        status: os.status,
        dataInicio: os.dataInicio,
        dataConclusao: os.dataConclusao,
        observacoesTecnicas: os.observacoesTecnicas,
        mecanicoResponsavel: os.responsavelMecanico ? os.responsavelMecanico.nome : null,
        atendimento: os.atendimento,
        progresso: {
          totalAtividades,
          concluidas,
          progressoPercent,
        },
        atividades: os.atividades,
        criadoEm: os.criadoEm,
      };
    });

    return reply.send({
      sucesso: true,
      total: formatadas.length,
      dados: formatadas,
    });
  });

  /**
   * GET /api/os/atendimento/:atendimentoId
   * Obter a OS vinculada a um atendimento específico
   */
  app.get('/atendimento/:atendimentoId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { atendimentoId } = request.params as { atendimentoId: string };

    const os = await prisma.ordemServico.findFirst({
      where: { atendimentoId, empresaId: tenant.empresaId },
      include: {
        responsavelMecanico: { select: { id: true, nome: true } },
        atividades: {
          include: {
            mecanico: { select: { id: true, nome: true } },
          },
          orderBy: { criadoEm: 'asc' },
        },
        reservasEstoque: {
          include: {
            produto: { select: { id: true, codigo: true, descricao: true, unidadeMedida: true } },
          },
        },
      },
    });

    if (!os) {
      return reply.send({ sucesso: true, dados: null });
    }

    return reply.send({ sucesso: true, dados: os });
  });

  /**
   * GET /api/os/:id
   * Obter detalhes completos de uma Ordem de Serviço
   */
  app.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const os = await prisma.ordemServico.findFirst({
      where: { id, empresaId: tenant.empresaId },
      include: {
        responsavelMecanico: { select: { id: true, nome: true, email: true } },
        atendimento: {
          include: {
            cliente: true,
            veiculo: true,
            medicao: true,
            diagnosticos: true,
          },
        },
        atividades: {
          include: {
            mecanico: { select: { id: true, nome: true } },
          },
          orderBy: { criadoEm: 'asc' },
        },
        reservasEstoque: {
          include: {
            produto: true,
          },
        },
      },
    });

    if (!os) {
      return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de serviço não encontrada.' });
    }

    return reply.send({ sucesso: true, dados: os });
  });

  /**
   * POST /api/os/planejar
   * Criar/Planejar Ordem de Serviço única para o atendimento (HU-014)
   */
  app.post(
    '/planejar',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_INICIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;

      const parseResult = PlanejarOSSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para planejar a OS',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const { atendimentoId, responsavelMecanicoId, observacoesTecnicas, atividades } = parseResult.data;

      // 1. Validar Atendimento
      const atendimento = await prisma.atendimento.findFirst({
        where: { id: atendimentoId, empresaId: tenant.empresaId },
      });

      if (!atendimento) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atendimento não encontrado.' });
      }

      // 2. Verificar se já existe OS para o Atendimento (Regra MVP: 1 OS por atendimento)
      const osExistente = await prisma.ordemServico.findFirst({
        where: { atendimentoId, empresaId: tenant.empresaId },
      });

      if (osExistente) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Já existe uma Ordem de Serviço (${osExistente.codigoFormatado}) vinculada a este atendimento.`,
        });
      }

      const anoAtual = new Date().getFullYear();

      const resultado = await prisma.$transaction(async (tx) => {
        // Gerar sequencial atômico de OS para a empresa
        const ultimaOS = await tx.ordemServico.findFirst({
          where: { empresaId: tenant.empresaId },
          orderBy: { numeroOS: 'desc' },
          select: { numeroOS: true },
        });

        const proximoNumero = (ultimaOS?.numeroOS ?? 0) + 1;
        const codigoFormatado = `OS-${anoAtual}-${String(proximoNumero).padStart(4, '0')}`;

        // Criar OS
        const os = await tx.ordemServico.create({
          data: {
            empresaId: tenant.empresaId,
            unidadeId: atendimento.unidadeId,
            atendimentoId,
            numeroOS: proximoNumero,
            codigoFormatado,
            status: StatusOS.PLANEJADA,
            responsavelMecanicoId: responsavelMecanicoId || tenant.usuarioId,
            observacoesTecnicas,
          },
        });

        // Criar Atividades
        for (const ativ of atividades) {
          await tx.atividadeOS.create({
            data: {
              empresaId: tenant.empresaId,
              ordemServicoId: os.id,
              itemOrcamentoId: ativ.itemOrcamentoId,
              descricao: ativ.descricao,
              status: StatusAtividade.PENDENTE,
              mecanicoId: ativ.mecanicoId || os.responsavelMecanicoId,
              tempoEstimadoMinutos: ativ.tempoEstimadoMinutos,
            },
          });
        }

        // Vincular reservas de estoque existentes do atendimento a esta OS
        await tx.reservaEstoque.updateMany({
          where: {
            empresaId: tenant.empresaId,
            atendimentoId,
            ordemServicoId: null,
          },
          data: {
            ordemServicoId: os.id,
          },
        });

        // Atualizar status do atendimento para EM_EXECUCAO se ainda não estava
        if (atendimento.status !== StatusAtendimento.EM_EXECUCAO) {
          await tx.atendimento.update({
            where: { id: atendimento.id },
            data: { status: StatusAtendimento.EM_EXECUCAO },
          });
        }

        return os;
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.CRIACAO,
        entidade: 'OrdemServico',
        entidadeId: resultado.id,
        detalhes: {
          codigoFormatado: resultado.codigoFormatado,
          atendimentoId,
          totalAtividades: atividades.length,
        },
      });

      return reply.status(201).send({
        sucesso: true,
        mensagem: `Ordem de Serviço ${resultado.codigoFormatado} planejada com sucesso!`,
        dados: resultado,
      });
    }
  );

  /**
   * PATCH /api/os/:id/iniciar
   * Iniciar execução da Ordem de Serviço (HU-014 / HU-015)
   */
  app.patch(
    '/:id/iniciar',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_INICIAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      const os = await prisma.ordemServico.findFirst({
        where: { id, empresaId: tenant.empresaId },
      });

      if (!os) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de serviço não encontrada.' });
      }

      if (os.status === StatusOS.CONCLUIDA || os.status === StatusOS.CANCELADA) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Não é possível iniciar uma OS com status '${os.status}'.`,
        });
      }

      const atualizada = await prisma.ordemServico.update({
        where: { id },
        data: {
          status: StatusOS.EM_ANDAMENTO,
          dataInicio: os.dataInicio || new Date(),
        },
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.TRANSICAO_ESTADO,
        entidade: 'OrdemServico',
        entidadeId: id,
        detalhes: { de: os.status, para: StatusOS.EM_ANDAMENTO },
      });

      return reply.send({
        sucesso: true,
        mensagem: 'Ordem de serviço iniciada com sucesso!',
        dados: atualizada,
      });
    }
  );

  /**
   * PATCH /api/os/atividades/:atividadeId/apontar
   * Apontamento de status e tempo de uma atividade técnica (HU-015)
   */
  app.patch(
    '/atividades/:atividadeId/apontar',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_EXECUTAR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { atividadeId } = request.params as { atividadeId: string };

      const parseResult = ApontarAtividadeSchema.safeParse({
        ...request.body as any,
        atividadeId,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos do apontamento',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const { novoStatus, motivoPausa, tempoGastoMinutos } = parseResult.data;

      const atividade = await prisma.atividadeOS.findFirst({
        where: { id: atividadeId, empresaId: tenant.empresaId },
        include: { ordemServico: true },
      });

      if (!atividade) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Atividade não encontrada.' });
      }

      const agora = new Date();
      let updateData: any = { status: novoStatus };

      if (novoStatus === StatusAtividade.EM_EXECUCAO) {
        if (!atividade.iniciadoEm) {
          updateData.iniciadoEm = agora;
        }
        updateData.mecanicoId = tenant.usuarioId;

        // Se a OS ainda estiver PLANEJADA, ativa para EM_ANDAMENTO
        if (atividade.ordemServico.status === StatusOS.PLANEJADA) {
          await prisma.ordemServico.update({
            where: { id: atividade.ordemServicoId },
            data: { status: StatusOS.EM_ANDAMENTO, dataInicio: agora },
          });
        }
      } else if (novoStatus === StatusAtividade.PAUSADA) {
        updateData.motivoPausa = motivoPausa || 'Pausa operacional';
        if (tempoGastoMinutos) {
          updateData.tempoRealizadoMinutos = atividade.tempoRealizadoMinutos + tempoGastoMinutos;
        }
      } else if (novoStatus === StatusAtividade.CONCLUIDA) {
        updateData.concluidoEm = agora;
        if (tempoGastoMinutos) {
          updateData.tempoRealizadoMinutos = atividade.tempoRealizadoMinutos + tempoGastoMinutos;
        } else if (atividade.tempoRealizadoMinutos === 0) {
          updateData.tempoRealizadoMinutos = atividade.tempoEstimadoMinutos;
        }
      }

      const atualizada = await prisma.atividadeOS.update({
        where: { id: atividadeId },
        data: updateData,
        include: {
          mecanico: { select: { id: true, nome: true } },
        },
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.ALTERACAO,
        entidade: 'AtividadeOS',
        entidadeId: atividadeId,
        detalhes: {
          de: atividade.status,
          para: novoStatus,
          tempoRealizado: atualizada.tempoRealizadoMinutos,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: `Atividade atualizada para '${novoStatus}'.`,
        dados: atualizada,
      });
    }
  );

  /**
   * POST /api/os/:id/consumir-material
   * Consumir e dar baixa de material de estoque na OS (HU-016)
   */
  app.post(
    '/:id/consumir-material',
    { preHandler: [exigirPermissao(PermissaoAcesso.ESTOQUE_CONSUMIR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      const parseResult = ConsumirMaterialOSSchema.safeParse({
        ...request.body as any,
        ordemServicoId: id,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: 'Dados inválidos para consumo de material',
          erros: parseResult.error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensagem: e.message,
          })),
        });
      }

      const { produtoId, quantidade, motivo } = parseResult.data;

      const os = await prisma.ordemServico.findFirst({
        where: { id, empresaId: tenant.empresaId },
      });

      if (!os) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de serviço não encontrada.' });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const prod = await tx.produto.findFirst({
          where: { id: produtoId, empresaId: tenant.empresaId },
        });

        if (!prod) {
          throw new Error('PRODUTO_NAO_ENCONTRADO');
        }

        const saldoFisicoAtual = Number(prod.saldoFisico);
        const saldoReservadoAtual = Number(prod.saldoReservado);

        if (saldoFisicoAtual < quantidade) {
          throw new Error('SALDO_FISICO_INSUFICIENTE');
        }

        // Verificar se há reserva correspondente ativa para abater
        const reserva = await tx.reservaEstoque.findFirst({
          where: {
            empresaId: tenant.empresaId,
            produtoId,
            status: 'ATIVA',
            OR: [
              { ordemServicoId: id },
              { atendimentoId: os.atendimentoId },
            ],
          },
        });

        let novoSaldoReservado = saldoReservadoAtual;
        if (reserva) {
          const qtdReserva = Number(reserva.quantidade);
          if (qtdReserva <= quantidade) {
            novoSaldoReservado = Math.max(0, saldoReservadoAtual - qtdReserva);
            await tx.reservaEstoque.update({
              where: { id: reserva.id },
              data: { status: 'CONSUMIDA' },
            });
          } else {
            novoSaldoReservado = Math.max(0, saldoReservadoAtual - quantidade);
            await tx.reservaEstoque.update({
              where: { id: reserva.id },
              data: { quantidade: qtdReserva - quantidade },
            });
          }
        }

        const novoSaldoFisico = Math.max(0, saldoFisicoAtual - quantidade);

        const produtoAtualizado = await tx.produto.update({
          where: { id: prod.id },
          data: {
            saldoFisico: novoSaldoFisico,
            saldoReservado: novoSaldoReservado,
          },
        });

        const movimento = await tx.movimentoEstoque.create({
          data: {
            empresaId: tenant.empresaId,
            produtoId: prod.id,
            tipo: TipoMovimentoEstoque.CONSUMO,
            quantidade,
            saldoFisicoAnterior: saldoFisicoAtual,
            saldoFisicoNovo: novoSaldoFisico,
            saldoReservadoAnterior: saldoReservadoAtual,
            saldoReservadoNovo: novoSaldoReservado,
            origemDocumento: os.codigoFormatado,
            usuarioId: tenant.usuarioId,
            motivo: motivo || `Consumo executado na OS ${os.codigoFormatado}`,
          },
        });

        return { produto: produtoAtualizado, movimento };
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.MOVIMENTACAO_ESTOQUE,
        entidade: 'OrdemServico',
        entidadeId: id,
        detalhes: {
          acao: 'CONSUMO_MATERIAL',
          produtoId,
          quantidade,
          os: os.codigoFormatado,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: 'Consumo de material registrado e estoque baixado com sucesso!',
        dados: {
          produtoId,
          saldoFisico: Number(resultado.produto.saldoFisico),
          saldoReservado: Number(resultado.produto.saldoReservado),
          saldoDisponivel: Number(resultado.produto.saldoFisico) - Number(resultado.produto.saldoReservado),
          movimentoId: resultado.movimento.id,
        },
      });
    }
  );

  /**
   * PATCH /api/os/:id/concluir
   * Concluir Ordem de Serviço e avançar Atendimento para AGUARDANDO_INSPECAO (HU-014 / DOC-003)
   */
  app.patch(
    '/:id/concluir',
    { preHandler: [exigirPermissao(PermissaoAcesso.OS_CONCLUIR)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenant = request.tenant!;
      const { id } = request.params as { id: string };

      const os = await prisma.ordemServico.findFirst({
        where: { id, empresaId: tenant.empresaId },
        include: {
          atividades: true,
          atendimento: true,
        },
      });

      if (!os) {
        return reply.status(404).send({ sucesso: false, mensagem: 'Ordem de serviço não encontrada.' });
      }

      if (os.status === StatusOS.CONCLUIDA) {
        return reply.status(400).send({ sucesso: false, mensagem: 'Esta Ordem de Serviço já está concluída.' });
      }

      // Validar se todas as atividades foram concluídas
      const atividadesPendentes = os.atividades.filter(
        (a) => a.status !== StatusAtividade.CONCLUIDA && a.status !== StatusAtividade.CANCELADA
      );

      if (atividadesPendentes.length > 0) {
        return reply.status(400).send({
          sucesso: false,
          mensagem: `Não é possível concluir a OS. Há ${atividadesPendentes.length} atividade(s) ainda não concluída(s): ${atividadesPendentes.map((a) => a.descricao).join(', ')}.`,
        });
      }

      const agora = new Date();

      const resultado = await prisma.$transaction(async (tx) => {
        const osConcluida = await tx.ordemServico.update({
          where: { id },
          data: {
            status: StatusOS.CONCLUIDA,
            dataConclusao: agora,
          },
        });

        // Transiciona atendimento para AGUARDANDO_INSPECAO (Próxima etapa: Inspeção Final da ENT-005)
        await tx.atendimento.update({
          where: { id: os.atendimentoId },
          data: {
            status: StatusAtendimento.AGUARDANDO_INSPECAO,
          },
        });

        return osConcluida;
      });

      await AuditoriaService.registrar({
        empresaId: tenant.empresaId,
        usuarioId: tenant.usuarioId,
        operacao: TipoOperacaoAuditoria.TRANSICAO_ESTADO,
        entidade: 'OrdemServico',
        entidadeId: id,
        detalhes: {
          status: StatusOS.CONCLUIDA,
          atendimentoId: os.atendimentoId,
          proximoStatusAtendimento: StatusAtendimento.AGUARDANDO_INSPECAO,
        },
      });

      return reply.send({
        sucesso: true,
        mensagem: `Ordem de Serviço ${resultado.codigoFormatado} concluída com sucesso! O atendimento agora está 'Aguardando Inspeção'.`,
        dados: resultado,
      });
    }
  );
}
