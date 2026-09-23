// Endpoint de estatísticas do dashboard.
// Mantém um cache curto para reduzir acessos redundantes ao banco sem expor dados muito desatualizados.

import { NextRequest, NextResponse } from 'next/server';
import { createServerServices } from '@/lib/database/server';
import { buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';

// Cache curto para reduzir a carga no banco sem tornar o dashboard completamente estático.
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    // 1) Resolve o usuário autenticado.
    const scope = requireAuthenticatedScope(request);

    // 2) Calcula estatísticas apenas dos dados permitidos na sessão.
    const { dashboardService } = createServerServices();
    const stats = await dashboardService.getDashboardStats(scope);

    return NextResponse.json({ success: true, data: stats }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao carregar dashboard.');
  }
}
