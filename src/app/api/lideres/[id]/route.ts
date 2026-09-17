import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';

const liderUpdateSchema = z.object({
  nome: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')).transform(value => value || undefined),
  telefone: z.string().optional(),
  cargo: z.string().optional(),
  avatar: z.string().optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida.').optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scope = requireAuthenticatedScope(request);
    const body = await request.json();
    const input = liderUpdateSchema.parse(body);

    const { liderService } = createServerServices();
    const lider = await liderService.updateLider(scope, params.id, input);

    return NextResponse.json({ success: true, data: lider }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para atualizar liderança.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao atualizar liderança.');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scope = requireAuthenticatedScope(request);
    const { liderService } = createServerServices();
    await liderService.deleteLider(scope, params.id);

    return NextResponse.json({ success: true, data: null }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao remover liderança.');
  }
}
