import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedScope } from '@/lib/auth/session';
import { prisma } from '@/lib/database/prisma';
import { AppError, buildErrorResponse } from '@/lib/errors';

const familiaCreateSchema = z.object({
  nome: z.string().optional(),
  caboEleitoralId: z.string().optional(),
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

export async function GET(request: NextRequest) {
  try {
    const scope = requireAuthenticatedScope(request);
    const where = scope.role === 'admin'
      ? { caboEleitoral: { adminId: scope.adminId } }
      : { caboEleitoralId: scope.caboId };

    const familias = await prisma.familia.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: familias.map(mapFamiliaRecord) }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Parâmetros inválidos.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao listar famílias.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = requireAuthenticatedScope(request);
    const body = await request.json();
    const input = familiaCreateSchema.parse(body);

    let caboEleitoralId = scope.role === 'admin'
      ? (input.caboEleitoralId ?? undefined)
      : scope.caboId;

    if (scope.role === 'admin' && !caboEleitoralId) {
      const fallbackCabo = await prisma.caboEleitoral.findFirst({
        where: { adminId: scope.adminId },
        select: { id: true },
      });
      caboEleitoralId = fallbackCabo?.id ?? undefined;
    }

    if (!caboEleitoralId) {
      throw new AppError('VALIDATION_ERROR', 400, 'Informe o cabo eleitoral responsável pela família.');
    }

    if (scope.role === 'admin') {
      const cabo = await prisma.caboEleitoral.findUnique({ where: { id: caboEleitoralId } });
      if (!cabo || cabo.adminId !== scope.adminId) {
        throw new AppError('FORBIDDEN', 403, 'Cabo eleitoral inválido para este usuário.');
      }
    }

    const familia = await prisma.familia.create({
      data: {
        caboEleitoralId,
        nome: input.nome?.trim() || undefined,
      },
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

    return NextResponse.json({ success: true, data: mapFamiliaRecord(familia) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para criar família.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao criar família.');
  }
}
