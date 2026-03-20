import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';

const caboCreateSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório.'),
  titulo: z.string().min(1, 'Título obrigatório.'),
  zona: z.string().min(1, 'Zona obrigatória.'),
  email: z.string().email('Email inválido.'),
  senha: z.string().min(6, 'Senha precisa ter ao menos 6 caracteres.'),
});

const caboQuerySchema = z.object({
  search: z.string().optional().default(''),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(5000).optional().default(12),
});

export async function GET(request: NextRequest) {
  try {
    const scope = requireAuthenticatedScope(request);
    const { searchParams } = new URL(request.url);
    const query = caboQuerySchema.parse({
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      perPage: searchParams.get('perPage') ?? undefined,
    });

    const { caboService } = createServerServices();
    const result = await caboService.getCabosPage(scope, query);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Parâmetros inválidos para listagem de cabos.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao listar cabos eleitorais.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = requireAuthenticatedScope(request);
    const body = await request.json();
    const input = caboCreateSchema.parse(body);

    const { caboService } = createServerServices();
    const cabo = await caboService.createCabo(scope, input);

    return NextResponse.json({ success: true, data: cabo }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para criar cabo.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao criar cabo eleitoral.');
  }
}
