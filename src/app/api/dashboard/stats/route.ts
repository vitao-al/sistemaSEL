// Endpoint de estatísticas do dashboard.
// Retorna métricas agregadas sem cache para o usuário autenticado.

import { NextRequest, NextResponse } from 'next/server';
import { createServerServices } from '@/lib/database/server';
import { buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';

// Força execução dinâmica e sem cache para evitar dados stale no dashboard.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
