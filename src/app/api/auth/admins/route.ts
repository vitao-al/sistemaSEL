import { NextResponse } from 'next/server';
import { createServerServices } from '@/lib/database/server';
import { buildErrorResponse } from '@/lib/errors';

export async function GET() {
  try {
    const { caboService } = createServerServices();
    const admins = await caboService.listAdmins();
    const safeAdmins = admins.map(admin => ({
      id: admin.id,
      nome: admin.nome,
    }));

    return NextResponse.json({ success: true, data: safeAdmins }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao listar admins.');
  }
}
