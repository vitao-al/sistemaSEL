import { NextResponse } from 'next/server';
import { createServerServices } from '@/lib/database/server';
import { buildErrorResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { dashboardService } = createServerServices();
    const stats = await dashboardService.getDashboardStats();

    return NextResponse.json({ success: true, data: stats }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao carregar dashboard.');
  }
}
