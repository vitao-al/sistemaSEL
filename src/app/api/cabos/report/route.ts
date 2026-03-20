import { NextRequest, NextResponse } from 'next/server';
import { createServerServices } from '@/lib/database/server';
import { buildErrorResponse, AppError } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const scope = requireAuthenticatedScope(request);
    if (scope.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403, 'Apenas admins podem gerar relatório geral.');
    }

    const { caboService, eleitorService } = createServerServices();
    const admins = await caboService.listAdmins();

    const adminsReport = await Promise.all(
      admins.map(async admin => {
        const adminScope = { role: 'admin' as const, userId: admin.id, adminId: admin.id };
        const cabosResult = await caboService.getCabosPage(adminScope, { search: '', page: 1, perPage: 5000 });
        const eleitores = await eleitorService.getEleitores(adminScope);

        const cabos = cabosResult.items.map(cabo => ({
          cabo,
          eleitores: eleitores.filter(item => item.caboEleitoralId === cabo.id),
        }));

        const totalCabos = cabos.length;
        const totalEleitores = cabos.reduce((accumulator, current) => accumulator + current.eleitores.length, 0);
        const totalPromessas = cabos.reduce(
          (accumulator, current) => accumulator + current.eleitores.filter(item => item.promessa).length,
          0
        );
        const totalPromessasConcluidas = cabos.reduce(
          (accumulator, current) => accumulator + current.eleitores.filter(item => item.promessaConcluida).length,
          0
        );

        return {
          admin,
          cabos,
          metrics: {
            totalCabos,
            totalEleitores,
            totalPromessas,
            totalPromessasConcluidas,
            totalPromessasPendentes: Math.max(0, totalPromessas - totalPromessasConcluidas),
          },
        };
      })
    );

    const globalMetrics = adminsReport.reduce(
      (accumulator, current) => ({
        totalAdmins: accumulator.totalAdmins + 1,
        totalCabos: accumulator.totalCabos + current.metrics.totalCabos,
        totalEleitores: accumulator.totalEleitores + current.metrics.totalEleitores,
        totalPromessas: accumulator.totalPromessas + current.metrics.totalPromessas,
        totalPromessasConcluidas: accumulator.totalPromessasConcluidas + current.metrics.totalPromessasConcluidas,
      }),
      {
        totalAdmins: 0,
        totalCabos: 0,
        totalEleitores: 0,
        totalPromessas: 0,
        totalPromessasConcluidas: 0,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        admins: adminsReport,
        metrics: {
          ...globalMetrics,
          totalPromessasPendentes: Math.max(0, globalMetrics.totalPromessas - globalMetrics.totalPromessasConcluidas),
        },
      },
    });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao gerar relatório.');
  }
}
