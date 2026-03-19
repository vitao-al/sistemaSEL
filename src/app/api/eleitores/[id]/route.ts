// Endpoint de leitura, atualização e remoção de eleitor por ID.
// Todas as ações são restritas ao escopo do usuário autenticado.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedUserId } from '@/lib/auth/session';

// Schema de atualização parcial do eleitor.
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
    // 1) Resolve usuário autenticado.
    const userId = requireAuthenticatedUserId(_);

    // 2) Busca eleitor no escopo do usuário.
    const { eleitorService } = createServerServices();
    const eleitor = await eleitorService.getEleitorById(userId, params.id);

    // 3) Retorna 404 quando não existe no escopo do usuário.
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
    // 1) Resolve usuário autenticado.
    const userId = requireAuthenticatedUserId(request);

    // 2) Valida payload de atualização.
    const body = await request.json();
    const input = eleitorUpdateSchema.parse(body);

    // 3) Atualiza recurso somente dentro do escopo do usuário.
    const { eleitorService } = createServerServices();
    const eleitor = await eleitorService.updateEleitor(userId, params.id, input);

    return NextResponse.json({ success: true, data: eleitor }, { status: 200 });
  } catch (error) {
    // Erro de payload inválido.
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para atualizar eleitor.', error.flatten()));
    }

    // Erro de domínio/infra.
    return buildErrorResponse(error, 'Falha ao atualizar eleitor.');
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    // 1) Resolve usuário autenticado.
    const userId = requireAuthenticatedUserId(_);

    // 2) Remove eleitor no escopo do usuário autenticado.
    const { eleitorService } = createServerServices();
    await eleitorService.deleteEleitor(userId, params.id);

    return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao remover eleitor.');
  }
}
