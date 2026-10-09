import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PerfilAcesso, PermissaoAcesso, StatusAtendimento, NivelCombustivel } from '@vortex/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed da base de dados do Vortex Auto...');

  // 1. Cadastrar Perfis
  const perfisData = [
    { codigo: PerfilAcesso.ADMIN_GERAL, nome: 'Administrador Geral', descricao: 'Acesso irrestrito a configurações, dados e segurança' },
    { codigo: PerfilAcesso.GESTOR, nome: 'Gestor da Oficina', descricao: 'Gestão operacional, alçadas e autorizações com pendência' },
    { codigo: PerfilAcesso.RECEPCAO, nome: 'Atendente / Recepção', descricao: 'Abertura de atendimentos, checklists iniciais e contato com cliente' },
    { codigo: PerfilAcesso.TECNICO, nome: 'Mecânico / Técnico', descricao: 'Execução de diagnósticos, apontamento de atividades e requisição de peças' },
    { codigo: PerfilAcesso.INSPETOR, nome: 'Inspetor de Qualidade', descricao: 'Inspeção final e validação de entrega técnica' },
    { codigo: PerfilAcesso.FINANCEIRO, nome: 'Financeiro', descricao: 'Gestão de cobranças, recebíveis e conciliações' },
  ];

  const perfisMap = new Map<string, string>();
  for (const p of perfisData) {
    const perfil = await prisma.perfil.upsert({
      where: { codigo: p.codigo },
      update: { nome: p.nome, descricao: p.descricao },
      create: p,
    });
    perfisMap.set(p.codigo, perfil.id);
  }

  // 2. Cadastrar Permissões
  const permissoesData = [
    { codigo: PermissaoAcesso.EMPRESA_GERENCIAR, nome: 'Gerenciar Empresa', modulo: 'ADMINISTRACAO' },
    { codigo: PermissaoAcesso.USUARIO_GERENCIAR, nome: 'Gerenciar Usuários e Acessos', modulo: 'ADMINISTRACAO' },
    { codigo: PermissaoAcesso.CLIENTE_GERENCIAR, nome: 'Gerenciar Clientes', modulo: 'CADASTROS' },
    { codigo: PermissaoAcesso.VEICULO_GERENCIAR, nome: 'Gerenciar Veículos', modulo: 'CADASTROS' },
    { codigo: PermissaoAcesso.PRODUTO_GERENCIAR, nome: 'Gerenciar Produtos e Peças', modulo: 'CADASTROS' },
    { codigo: PermissaoAcesso.ATENDIMENTO_ABRIR, nome: 'Abrir Atendimento', modulo: 'JORNADA' },
    { codigo: PermissaoAcesso.ATENDIMENTO_EDITAR, nome: 'Editar Atendimento', modulo: 'JORNADA' },
    { codigo: PermissaoAcesso.DIAGNOSTICO_REGISTRAR, nome: 'Registrar Diagnóstico', modulo: 'JORNADA' },
    { codigo: PermissaoAcesso.ORCAMENTO_CRIAR, nome: 'Criar Orçamento', modulo: 'COMERCIAL' },
    { codigo: PermissaoAcesso.ORCAMENTO_APRESENTAR, nome: 'Apresentar Orçamento', modulo: 'COMERCIAL' },
    { codigo: PermissaoAcesso.ORCAMENTO_DECIDIR, nome: 'Registrar Aprovação de Orçamento', modulo: 'COMERCIAL' },
    { codigo: PermissaoAcesso.OS_INICIAR, nome: 'Iniciar Ordem de Serviço', modulo: 'EXECUCAO' },
    { codigo: PermissaoAcesso.OS_EXECUTAR, nome: 'Executar e Apontar Atividades', modulo: 'EXECUCAO' },
    { codigo: PermissaoAcesso.OS_CONCLUIR, nome: 'Concluir Ordem de Serviço', modulo: 'EXECUCAO' },
    { codigo: PermissaoAcesso.ESTOQUE_RESERVAR, nome: 'Reservar Peças do Estoque', modulo: 'MATERIAIS' },
    { codigo: PermissaoAcesso.ESTOQUE_CONSUMIR, nome: 'Consumir Peças do Estoque', modulo: 'MATERIAIS' },
    { codigo: PermissaoAcesso.ESTOQUE_AJUSTAR, nome: 'Ajustar Saldos de Estoque', modulo: 'MATERIAIS' },
    { codigo: PermissaoAcesso.INSPECAO_EXECUTAR, nome: 'Executar Inspeção Final', modulo: 'ENTREGA' },
    { codigo: PermissaoAcesso.ENTREGA_LIBERAR, nome: 'Liberar Entrega do Veículo', modulo: 'ENTREGA' },
    { codigo: PermissaoAcesso.ENTREGA_COM_DEBITO, nome: 'Autorizar Entrega com Débito', modulo: 'ENTREGA' },
    { codigo: PermissaoAcesso.COBRANCA_GERAR, nome: 'Gerar Cobrança', modulo: 'FINANCEIRO' },
    { codigo: PermissaoAcesso.RECEBIMENTO_REGISTRAR, nome: 'Registrar Recebimento', modulo: 'FINANCEIRO' },
    { codigo: PermissaoAcesso.RECEBIMENTO_ESTORNAR, nome: 'Estornar Recebimento', modulo: 'FINANCEIRO' },
    { codigo: PermissaoAcesso.AUDITORIA_VISUALIZAR, nome: 'Visualizar Logs de Auditoria', modulo: 'SEGURANCA' },
    { codigo: PermissaoAcesso.RELATORIOS_VISUALIZAR, nome: 'Visualizar Relatórios e Histórico', modulo: 'RELATORIOS' },
  ];

  for (const perm of permissoesData) {
    const permissao = await prisma.permissao.upsert({
      where: { codigo: perm.codigo },
      update: { nome: perm.nome, modulo: perm.modulo },
      create: perm,
    });

    const adminPerfilId = perfisMap.get(PerfilAcesso.ADMIN_GERAL);
    if (adminPerfilId) {
      await prisma.perfilPermissao.upsert({
        where: { perfilId_permissaoId: { perfilId: adminPerfilId, permissaoId: permissao.id } },
        update: {},
        create: { perfilId: adminPerfilId, permissaoId: permissao.id },
      });
    }
  }

  // 3. Cadastrar Categorias de Veículos (DOC-001 e DOC-002)
  const categoriasData = [
    { codigo: 'PASSEIO', nome: 'Automóvel de Passeio' },
    { codigo: 'SUV', nome: 'SUV / Crossover' },
    { codigo: 'PICKUP', nome: 'Picape / Utilitário Leve' },
    { codigo: 'MOTO', nome: 'Motocicleta' },
    { codigo: 'VAN', nome: 'Van / Furgão' },
    { codigo: 'CAMINHAO', nome: 'Caminhão' },
    { codigo: 'OUTRO', nome: 'Outra Categoria' },
  ];

  const categoriasMap = new Map<string, string>();
  for (const cat of categoriasData) {
    const reg = await prisma.categoriaVeiculo.upsert({
      where: { codigo: cat.codigo },
      update: { nome: cat.nome },
      create: cat,
    });
    categoriasMap.set(cat.codigo, reg.id);
  }

  // 4. Cadastrar Empresa Piloto / Demonstração
  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '12345678000190' },
    update: {},
    create: {
      razaoSocial: 'Vortex Auto Mecânica Ltda',
      nomeFantasia: 'Vortex Auto Matriz',
      cnpj: '12345678000190',
      telefone: '(11) 98765-4321',
      cidade: 'São Paulo',
      uf: 'SP',
      ativo: true,
    },
  });

  // 5. Cadastrar Unidade Operacional Ativa (MVP: 1 unidade ativa por empresa)
  let unidade = await prisma.unidade.findFirst({
    where: { empresaId: empresa.id },
  });

  if (!unidade) {
    unidade = await prisma.unidade.create({
      data: {
        empresaId: empresa.id,
        nome: 'Matriz - Centro Automotivo',
        principal: true,
        ativo: true,
      },
    });
  }

  // 6. Cadastrar Usuário Administrador Inicial
  const senhaHash = await bcrypt.hash('admin123', 10);
  const usuarioAdmin = await prisma.usuario.upsert({
    where: { email: 'admin@vortexauto.com.br' },
    update: { senhaHash },
    create: {
      nome: 'Administrador Vortex',
      email: 'admin@vortexauto.com.br',
      senhaHash,
      ativo: true,
      superAdmin: true,
    },
  });

  // 7. Criar Vínculo Usuário-Empresa com Perfil ADMIN_GERAL
  const vinculo = await prisma.vinculoUsuarioEmpresa.upsert({
    where: { usuarioId_empresaId: { usuarioId: usuarioAdmin.id, empresaId: empresa.id } },
    update: { unidadeId: unidade.id, ativo: true },
    create: {
      usuarioId: usuarioAdmin.id,
      empresaId: empresa.id,
      unidadeId: unidade.id,
      ativo: true,
      alcadaDesconto: 100.0,
    },
  });

  const adminPerfilId = perfisMap.get(PerfilAcesso.ADMIN_GERAL);
  if (adminPerfilId) {
    await prisma.vinculoPerfil.upsert({
      where: { vinculoId_perfilId: { vinculoId: vinculo.id, perfilId: adminPerfilId } },
      update: {},
      create: { vinculoId: vinculo.id, perfilId: adminPerfilId },
    });
  }

  // 8. ENT-002: Dados Demonstrativos de Cliente, Veículo e Atendimento
  const clienteDemo = await prisma.cliente.upsert({
    where: { empresaId_cpfCnpj: { empresaId: empresa.id, cpfCnpj: '12345678909' } },
    update: {},
    create: {
      empresaId: empresa.id,
      tipo: 'FISICA',
      nomeRazao: 'Carlos Eduardo Silva',
      cpfCnpj: '12345678909',
      telefone: '(11) 99123-4567',
      email: 'carlos.silva@email.com',
      cidade: 'São Paulo',
      uf: 'SP',
      observacoes: 'Cliente preferencial, troca de óleo regular.',
    },
  });

  const categoriaPasseioId = categoriasMap.get('PASSEIO')!;
  const veiculoDemo = await prisma.veiculo.upsert({
    where: { empresaId_placa: { empresaId: empresa.id, placa: 'BRA2E19' } },
    update: {},
    create: {
      empresaId: empresa.id,
      placa: 'BRA2E19',
      marca: 'Honda',
      modelo: 'Civic EXL 2.0 Flex',
      anoFabricacao: 2021,
      anoModelo: 2021,
      cor: 'Cinza Metálico',
      combustivel: 'Flex',
      categoriaId: categoriaPasseioId,
    },
  });

  await prisma.vinculoClienteVeiculo.upsert({
    where: {
      clienteId_veiculoId_empresaId: {
        clienteId: clienteDemo.id,
        veiculoId: veiculoDemo.id,
        empresaId: empresa.id,
      },
    },
    update: {},
    create: {
      empresaId: empresa.id,
      clienteId: clienteDemo.id,
      veiculoId: veiculoDemo.id,
      papel: 'PROPRIETARIO',
    },
  });

  // Atendimento Demonstrativo
  const atendimentoExistente = await prisma.atendimento.findFirst({
    where: { empresaId: empresa.id, numeroSequencial: 1 },
  });

  if (!atendimentoExistente) {
    const atendimento = await prisma.atendimento.create({
      data: {
        empresaId: empresa.id,
        unidadeId: unidade.id,
        numeroSequencial: 1,
        codigoFormatado: 'AT-2026-0001',
        clienteId: clienteDemo.id,
        veiculoId: veiculoDemo.id,
        usuarioAberturaId: usuarioAdmin.id,
        status: StatusAtendimento.CONFIRMADO,
        queixaPrincipal: 'Ruído metálico na roda dianteira direita ao frear em declives e trepidação suave no volante.',
        previsaoEntrega: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Em 2 dias
      },
    });

    await prisma.medicaoVeiculo.create({
      data: {
        empresaId: empresa.id,
        atendimentoId: atendimento.id,
        quilometragem: 54320,
        nivelCombustivel: NivelCombustivel.MEIO,
        pertencesDeixados: 'Óculos de sol no porta-luvas.',
        avariasPrevias: 'Pequeno risco no para-choque traseiro lado esquerdo.',
        temEstepe: true,
        temMacaco: true,
        temChaveRoda: true,
        temManualChaveReserva: true,
      },
    });
  }

  console.log('Seed ENT-002 concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
