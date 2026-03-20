import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';

const eleitorValidateSchema = z.object({
  cpf: z.string().optional(),
  tituloEleitor: z.string().optional(),
  excludeId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    requireAuthenticatedScope(request);

    const { searchParams } = new URL(request.url);
    const query = eleitorValidateSchema.parse({
      cpf: searchParams.get('cpf') ?? undefined,
      tituloEleitor: searchParams.get('tituloEleitor') ?? undefined,
      excludeId: searchParams.get('excludeId') ?? undefined,
    });

    const { eleitorService } = createServerServices();
    const result = await eleitorService.validateUniqueFields(query);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Parâmetros inválidos para validação.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao validar CPF e título de eleitor.');
  }
}
