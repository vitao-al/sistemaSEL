import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';

const caboUpdateSchema = z.object({
  nome: z.string().min(1).optional(),
  titulo: z.string().min(1).optional(),
  zona: z.string().min(1).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(6).optional(),
});

type RouteParams = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const scope = requireAuthenticatedScope(request);
    const body = await request.json();
    const input = caboUpdateSchema.parse(body);

    const { caboService } = createServerServices();
    const cabo = await caboService.updateCabo(scope, params.id, input);

    return NextResponse.json({ success: true, data: cabo }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para atualizar cabo.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao atualizar cabo eleitoral.');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const scope = requireAuthenticatedScope(request);

    const { caboService } = createServerServices();
    await caboService.deleteCabo(scope, params.id);

    return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao remover cabo eleitoral.');
  }
}
