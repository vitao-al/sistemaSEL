import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedScope } from '@/lib/auth/session';
import { prisma } from '@/lib/database/prisma';
import { AppError, buildErrorResponse } from '@/lib/errors';

const membroSchema = z.object({
  eleitorId: z.string().min(1),
  grauParentesco: z.string().min(1).max(80),
});

function mapMembroRecord(record: any) {
  return {
    ...record,
    eleitor: record.eleitor
      ? {
          id: record.eleitor.id,
          nome: record.eleitor.nome ?? undefined,
          cpf: record.eleitor.cpf ?? undefined,
          tituloEleitor: record.eleitor.tituloEleitor ?? undefined,
          zona: record.eleitor.zona ?? undefined,
        }
      : undefined,
  };
}

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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scope = requireAuthenticatedScope(request);
    await getFamiliaByScope(scope, params.id);

    const body = await request.json();
    const input = membroSchema.parse(body);

    const eleitor = await prisma.eleitor.findUnique({
      where: { id: input.eleitorId },
      include: { caboEleitoral: { select: { id: true, adminId: true } } },
    });

    if (!eleitor) {
      throw new AppError('NOT_FOUND', 404, 'Eleitor não encontrado.');
    }

    if (scope.role === 'admin' && eleitor.caboEleitoral.adminId !== scope.adminId) {
      throw new AppError('FORBIDDEN', 403, 'Eleitor fora do escopo do admin.');
    }

    if (scope.role === 'cabo' && eleitor.caboEleitoralId !== scope.caboId) {
      throw new AppError('FORBIDDEN', 403, 'Eleitor fora do escopo do cabo.');
    }

    const existing = await prisma.familiaMembro.findFirst({
      where: { eleitorId: input.eleitorId },
    });

    if (existing && existing.familiaId !== params.id) {
      throw new AppError('CONFLICT', 409, 'Este eleitor já pertence a outra família.');
    }

    const membro = await prisma.familiaMembro.create({
      data: {
        familiaId: params.id,
        eleitorId: input.eleitorId,
        grauParentesco: input.grauParentesco.trim(),
      },
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

    return NextResponse.json({ success: true, data: mapMembroRecord(membro) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados de vínculo inválidos.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao vincular eleitor à família.');
  }
}
