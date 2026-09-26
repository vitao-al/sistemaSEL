import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedScope } from '@/lib/auth/session';
import { prisma } from '@/lib/database/prisma';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { deleteFamiliaWithMembers } from '@/lib/familias';

const familiaUpdateSchema = z.object({
  nome: z.string().optional(),
});

function mapFamiliaRecord(record: any) {
  return {
    ...record,
    nome: record.nome ?? undefined,
    membros: (record.membros ?? []).map((membro: any) => ({
      ...membro,
      eleitor: membro.eleitor
        ? {
            id: membro.eleitor.id,
            nome: membro.eleitor.nome ?? undefined,
            cpf: membro.eleitor.cpf ?? undefined,
            tituloEleitor: membro.eleitor.tituloEleitor ?? undefined,
            zona: membro.eleitor.zona ?? undefined,
          }
        : undefined,
    })),
  };
}

async function getFamiliaByScope(scope: ReturnType<typeof requireAuthenticatedScope>, id: string) {
  const where = scope.role === 'admin'
    ? { id, caboEleitoral: { adminId: scope.adminId } }
    : { id, caboEleitoralId: scope.caboId };

  const familia = await prisma.familia.findFirst({
    where,
    include: {
      caboEleitoral: { select: { id: true, nome: true, zona: true } },
      membros: {
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
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!familia) {
    throw new AppError('NOT_FOUND', 404, 'Família não encontrada.');
  }

  return familia;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scope = requireAuthenticatedScope(request);
    const familia = await getFamiliaByScope(scope, params.id);
    return NextResponse.json({ success: true, data: mapFamiliaRecord(familia) }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao carregar família.');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scope = requireAuthenticatedScope(request);
    await getFamiliaByScope(scope, params.id);

    const body = await request.json();
    const input = familiaUpdateSchema.parse(body);

    const familia = await prisma.familia.update({
      where: { id: params.id },
      data: { nome: input.nome?.trim() ? input.nome.trim() : null },
      include: {
        caboEleitoral: { select: { id: true, nome: true, zona: true } },
        membros: {
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: mapFamiliaRecord(familia) }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para atualizar família.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao atualizar família.');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scope = requireAuthenticatedScope(request);
    const existing = await prisma.familia.findFirst({
      where: scope.role === 'admin'
        ? { id: params.id, caboEleitoral: { adminId: scope.adminId } }
        : { id: params.id, caboEleitoralId: scope.caboId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }

    await deleteFamiliaWithMembers(prisma, params.id);
    return NextResponse.json({ success: true, data: null }, { status: 200 });
  } catch (error) {
    return buildErrorResponse(error, 'Falha ao remover família.');
  }
}
