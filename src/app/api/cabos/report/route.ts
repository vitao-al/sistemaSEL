import { NextRequest, NextResponse } from 'next/server';
import { createServerServices } from '@/lib/database/server';
import { buildErrorResponse, AppError } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';
import { prisma } from '@/lib/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const scope = requireAuthenticatedScope(request);
    if (scope.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403, 'Apenas admins podem gerar relatório geral.');
    }

    const { caboService, eleitorService } = createServerServices();
    const admins = await caboService.listAdmins();

    // Monta relatório por admin com detalhes por cabo e por eleitor.
    const adminsReport = await Promise.all(
      admins.map(async admin => {
        const adminScope = { role: 'admin' as const, userId: admin.id, adminId: admin.id };
        const cabosResult = await caboService.getCabosPage(adminScope, { search: '', page: 1, perPage: 5000 });
        const eleitoresAll = await eleitorService.getEleitores(adminScope);

        const cabos = await Promise.all(
          cabosResult.items.map(async cabo => {
            // eleitores do cabo (cada eleitor será uma linha na tabela)
            const eleitores = eleitoresAll.filter(item => item.caboEleitoralId === cabo.id).map(e => ({
              id: e.id,
              nome: e.nome ?? '-',
              cpf: e.cpf ?? '-',
              tituloEleitor: e.tituloEleitor ?? '-',
              zona: e.zona ?? '-',
              sessao: e.sessao ?? '-',
              telefone: e.telefone ?? '-',
              localVotacao: e.localVotacao ?? '-',
              promessa: e.promessa ?? undefined,
              promessaConcluida: Boolean(e.promessaConcluida),
              statusPromessa: e.promessa
                ? e.promessaConcluida
                  ? 'Concluída'
                  : 'Pendente'
                : 'Sem promessa',
              createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
              updatedAt: e.updatedAt ? new Date(e.updatedAt).toISOString() : null,
            }));

            // contagem de famílias vinculadas ao cabo
            const familiasCount = await prisma.familia.count({ where: { caboEleitoralId: cabo.id } });

            return {
              cabo,
              familiasCount,
              eleitores,
            };
          })
        );

        const totalCabos = cabos.length;
        const totalEleitores = cabos.reduce((acc, c) => acc + c.eleitores.length, 0);
        const totalPromessas = cabos.reduce((acc, c) => acc + c.eleitores.filter(el => el.promessa).length, 0);
        const totalPromessasConcluidas = cabos.reduce((acc, c) => acc + c.eleitores.filter(el => el.promessaConcluida).length, 0);
        const totalFamilias = await prisma.familia.count({ where: { caboEleitoral: { adminId: admin.id } } });

        return {
          admin,
          cabos,
          metrics: {
            totalCabos,
            totalEleitores,
            totalPromessas,
            totalPromessasConcluidas,
            totalPromessasPendentes: Math.max(0, totalPromessas - totalPromessasConcluidas),
            totalFamilias,
          },
        };
      })
    );
    // Métricas globais
    const totalAdmins = adminsReport.length;
    const totalCabos = adminsReport.reduce((acc, a) => acc + a.metrics.totalCabos, 0);
    const totalEleitores = adminsReport.reduce((acc, a) => acc + a.metrics.totalEleitores, 0);
    const totalPromessas = adminsReport.reduce((acc, a) => acc + a.metrics.totalPromessas, 0);
    const totalPromessasConcluidas = adminsReport.reduce((acc, a) => acc + a.metrics.totalPromessasConcluidas, 0);
    const totalFamilias = adminsReport.reduce((acc, a) => acc + (a.metrics.totalFamilias ?? 0), 0);

    // Seção: Eleitores por Admin
    const eleitoresPorAdmin = adminsReport.map(a => ({
      adminId: a.admin.id,
      adminNome: a.admin.nome,
      totalEleitores: a.metrics.totalEleitores,
    }));

    // Seção: Status de promessas com taxa
    const promessasConcluidas = totalPromessasConcluidas;
    const promessasPendentes = Math.max(0, totalPromessas - totalPromessasConcluidas);
    const taxaConclusao = totalPromessas === 0 ? 0 : Math.round((promessasConcluidas / totalPromessas) * 100);

    // Tabela-resumo por admin
    const tabelaResumoPorAdmin = adminsReport.map(a => ({
      adminId: a.admin.id,
      adminNome: a.admin.nome,
      cabos: a.metrics.totalCabos,
      eleitores: a.metrics.totalEleitores,
      promessas: a.metrics.totalPromessas,
      concluidas: a.metrics.totalPromessasConcluidas,
      pendentes: a.metrics.totalPromessasPendentes,
      familias: a.metrics.totalFamilias ?? 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        // Mantemos 'cards' para compatibilidade com o documento gerado
        cards: {
          totalAdmins,
          totalCabos,
          totalEleitores,
          totalPromessas,
          totalFamilias,
        },
        // Aqui adicionamos o objeto `metrics` esperado pelo frontend
        metrics: {
          totalAdmins,
          totalCabos,
          totalEleitores,
          totalPromessas,
          totalPromessasConcluidas,
          totalPromessasPendentes: Math.max(0, totalPromessas - totalPromessasConcluidas),
        },
        eleitoresPorAdmin,
        statusPromessas: {
          concluidas: promessasConcluidas,
          pendentes: promessasPendentes,
          taxaConclusaoPercentual: taxaConclusao,
        },
        tabelaResumoPorAdmin,
        admins: adminsReport,
      },
    });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao gerar relatório.');
  }
}
