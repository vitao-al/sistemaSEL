import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';

const liderCreateSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório.'),
  email: z.string().email('Email inválido.').optional().or(z.literal('')).transform(value => value || undefined),
  telefone: z.string().optional(),
  cargo: z.string().optional(),
  avatar: z.string().optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida.').optional(),
});

const liderQuerySchema = z.object({
  search: z.string().optional().default(''),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(5000).optional().default(12),
});

export async function GET(request: NextRequest) {
  try {
    const scope = requireAuthenticatedScope(request);
    const { searchParams } = new URL(request.url);
    const query = liderQuerySchema.parse({
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      perPage: searchParams.get('perPage') ?? undefined,
    });

    const { liderService } = createServerServices();
    const result = await liderService.listLideres(scope, query);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Parâmetros inválidos para listagem de lideranças.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao listar lideranças.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = requireAuthenticatedScope(request);
    const body = await request.json();
    const input = liderCreateSchema.parse(body);

    const { liderService } = createServerServices();
    const lider = await liderService.createLider(scope, input);

    return NextResponse.json({ success: true, data: lider }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para criar liderança.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao criar liderança.');
  }
}
