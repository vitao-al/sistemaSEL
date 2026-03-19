import { NextRequest, NextResponse } from 'next/server';
import { createServerServices } from '@/lib/database/server';
import { buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedUserId } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userId = requireAuthenticatedUserId(request);
    const { dashboardService } = createServerServices();
    const stats = await dashboardService.getDashboardStats(userId);

    return NextResponse.json({ success: true, data: stats }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao carregar dashboard.');
  }
}
