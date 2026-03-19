import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedUserId } from '@/lib/auth/session';

const eleitorCreateSchema = z.object({
  nome: z.string().optional(),
  cpf: z.string().optional(),
  tituloEleitor: z.string().optional(),
  sessao: z.string().optional(),
  zona: z.string().optional(),
  localVotacao: z.string().optional(),
  promessa: z.string().optional(),
  promessaConcluida: z.boolean().optional(),
});

const eleitorQuerySchema = z.object({
  search: z.string().optional().default(''),
  zona: z.string().optional().default(''),
  promessa: z.enum(['', 'concluida', 'pendente', 'sem']).optional().default(''),
  sortField: z.enum(['nome', 'zona', 'createdAt']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(100).optional().default(12),
});

export async function GET(request: NextRequest) {
  try {
    const userId = requireAuthenticatedUserId(request);
    const { searchParams } = new URL(request.url);
    const query = eleitorQuerySchema.parse({
      search: searchParams.get('search') ?? undefined,
      zona: searchParams.get('zona') ?? undefined,
      promessa: searchParams.get('promessa') ?? undefined,
      sortField: searchParams.get('sortField') ?? undefined,
      sortDir: searchParams.get('sortDir') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      perPage: searchParams.get('perPage') ?? undefined,
    });

    const { eleitorService } = createServerServices();
  const result = await eleitorService.getEleitoresPage(userId, query);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Parâmetros de consulta inválidos.', error.flatten()));
    }
    return buildErrorResponse(error, 'Falha ao listar eleitores.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = requireAuthenticatedUserId(request);
    const body = await request.json();
    const input = eleitorCreateSchema.parse(body);

    const { eleitorService } = createServerServices();
    const eleitor = await eleitorService.createEleitor(userId, input);
    return NextResponse.json({ success: true, data: eleitor }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para criar eleitor.', error.flatten()));
    }
    return buildErrorResponse(error, 'Falha ao criar eleitor.');
  }
}
