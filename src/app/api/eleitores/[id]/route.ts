import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';

const eleitorUpdateSchema = z.object({
  nome: z.string().optional(),
  cpf: z.string().optional(),
  tituloEleitor: z.string().optional(),
  sessao: z.string().optional(),
  zona: z.string().optional(),
  localVotacao: z.string().optional(),
  promessa: z.string().optional(),
  promessaConcluida: z.boolean().optional(),
});

type RouteParams = {
  params: { id: string };
};

export async function GET(_: NextRequest, { params }: RouteParams) {
  try {
    const { eleitorService } = createServerServices();
    const eleitor = await eleitorService.getEleitorById(params.id);

    if (!eleitor) {
      throw new AppError('NOT_FOUND', 404, 'Eleitor não encontrado.');
    }

    return NextResponse.json({ success: true, data: eleitor }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao buscar eleitor.');
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const input = eleitorUpdateSchema.parse(body);

    const { eleitorService } = createServerServices();
    const eleitor = await eleitorService.updateEleitor(params.id, input);

    return NextResponse.json({ success: true, data: eleitor }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para atualizar eleitor.', error.flatten()));
    }
    return buildErrorResponse(error, 'Falha ao atualizar eleitor.');
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    const { eleitorService } = createServerServices();
    await eleitorService.deleteEleitor(params.id);

    return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao remover eleitor.');
  }
}
