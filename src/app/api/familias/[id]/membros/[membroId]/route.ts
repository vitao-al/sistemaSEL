import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedScope } from '@/lib/auth/session';
import { prisma } from '@/lib/database/prisma';
import { AppError, buildErrorResponse } from '@/lib/errors';

const membroUpdateSchema = z.object({
  grauParentesco: z.string().min(1).max(80),
});

async function getFamiliaByScope(scope: ReturnType<typeof requireAuthenticatedScope>, familiaId: string) {
  const where = scope.role === 'admin'
    ? { id: familiaId, caboEleitoral: { adminId: scope.adminId } }
    : { id: familiaId, caboEleitoralId: scope.caboId };

  const familia = await prisma.familia.findFirst({ where });
  if (!familia) {
    throw new AppError('NOT_FOUND', 404, 'Família não encontrada.');
  }

  return familia;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string; membroId: string } }) {
  try {
    const scope = requireAuthenticatedScope(request);
    await getFamiliaByScope(scope, params.id);

    const body = await request.json();
    const input = membroUpdateSchema.parse(body);

    const membro = await prisma.familiaMembro.update({
      where: { id: params.membroId },
      data: { grauParentesco: input.grauParentesco.trim() },
      include: {
        eleitor: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            tituloEleitor: true,
            zona: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: membro }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados do parentesco inválidos.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao atualizar grau de parentesco.');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; membroId: string } }) {
  try {
    const scope = requireAuthenticatedScope(request);
    await getFamiliaByScope(scope, params.id);

    const membro = await prisma.familiaMembro.findUnique({ where: { id: params.membroId } });
    if (!membro) {
      throw new AppError('NOT_FOUND', 404, 'Vínculo não encontrado.');
    }

    if (membro.familiaId !== params.id) {
      throw new AppError('FORBIDDEN', 403, 'Vínculo não pertence a esta família.');
    }

    await prisma.familiaMembro.delete({ where: { id: params.membroId } });
    return NextResponse.json({ success: true, data: null }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao remover vínculo da família.');
  }
}
