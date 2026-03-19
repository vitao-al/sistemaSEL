import { prisma } from './prisma';
import { AppError } from '@/lib/errors';
import {
  CreateEleitorInput,
  DatabaseAdapter,
  EleitorQueryParams,
  PaginatedEleitoresResult,
  UpdateEleitorInput,
  UserWithPassword,
} from './types';
import { Eleitor } from '@/types';

function mapEleitor(record: {
  id: string;
  nome: string | null;
  cpf: string | null;
  tituloEleitor: string | null;
  sessao: string | null;
  zona: string | null;
  localVotacao: string | null;
  promessa: string | null;
  promessaConcluida: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Eleitor {
  return {
    id: record.id,
    nome: record.nome ?? undefined,
    cpf: record.cpf ?? undefined,
    tituloEleitor: record.tituloEleitor ?? undefined,
    sessao: record.sessao ?? undefined,
    zona: record.zona ?? undefined,
    localVotacao: record.localVotacao ?? undefined,
    promessa: record.promessa ?? undefined,
    promessaConcluida: record.promessaConcluida,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export class PostgresDatabaseAdapter implements DatabaseAdapter {
  private buildEleitorWhere(params: EleitorQueryParams) {
    const where: Record<string, unknown> = {};

    if (params.search) {
      where.OR = [
        { nome: { contains: params.search, mode: 'insensitive' } },
        { cpf: { contains: params.search, mode: 'insensitive' } },
        { tituloEleitor: { contains: params.search, mode: 'insensitive' } },
        { sessao: { contains: params.search, mode: 'insensitive' } },
        { zona: { contains: params.search, mode: 'insensitive' } },
        { localVotacao: { contains: params.search, mode: 'insensitive' } },
        { promessa: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.zona) {
      where.zona = params.zona;
    }

    if (params.promessa === 'concluida') {
      where.AND = [{ promessa: { not: null } }, { promessaConcluida: true }];
    }

    if (params.promessa === 'pendente') {
      where.AND = [{ promessa: { not: null } }, { promessaConcluida: false }];
    }

    if (params.promessa === 'sem') {
      where.promessa = null;
    }

    return where;
  }

  async findUserByCredentials(email: string, senha: string): Promise<UserWithPassword | null> {
    try {
      const user = await prisma.user.findFirst({ where: { email, senha } });
      if (!user) return null;

      return {
        id: user.id,
        nome: user.nome,
        email: user.email,
        senha: user.senha,
        avatar: user.avatar ?? undefined,
        cargo: user.cargo ?? undefined,
        createdAt: user.createdAt.toISOString(),
      };
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao buscar usuário no banco de dados.');
    }
  }

  async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;

      return {
        id: user.id,
        nome: user.nome,
        email: user.email,
        senha: user.senha,
        avatar: user.avatar ?? undefined,
        cargo: user.cargo ?? undefined,
        createdAt: user.createdAt.toISOString(),
      };
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao buscar usuário por email.');
    }
  }

  async findUserById(id: string): Promise<UserWithPassword | null> {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;

      return {
        id: user.id,
        nome: user.nome,
        email: user.email,
        senha: user.senha,
        avatar: user.avatar ?? undefined,
        cargo: user.cargo ?? undefined,
        createdAt: user.createdAt.toISOString(),
      };
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao buscar usuário por ID.');
    }
  }

  async updateUser(id: string, data: Partial<UserWithPassword>): Promise<UserWithPassword> {
    try {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          nome: data.nome,
          email: data.email,
          senha: data.senha,
          avatar: data.avatar,
          cargo: data.cargo,
        },
      });

      return {
        id: updated.id,
        nome: updated.nome,
        email: updated.email,
        senha: updated.senha,
        avatar: updated.avatar ?? undefined,
        cargo: updated.cargo ?? undefined,
        createdAt: updated.createdAt.toISOString(),
      };
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao atualizar usuário.');
    }
  }

  async listEleitores(): Promise<Eleitor[]> {
    try {
      const eleitores = await prisma.eleitor.findMany({ orderBy: { createdAt: 'desc' } });
      return eleitores.map(mapEleitor);
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao listar eleitores.');
    }
  }

  async queryEleitores(params: EleitorQueryParams): Promise<PaginatedEleitoresResult> {
    try {
      const page = Math.max(1, params.page);
      const perPage = Math.max(1, params.perPage);
      const skip = (page - 1) * perPage;
      const sortField = params.sortField ?? 'createdAt';
      const sortDir = params.sortDir ?? 'desc';

      const where = this.buildEleitorWhere(params);

      const [items, total] = await Promise.all([
        prisma.eleitor.findMany({
          where,
          orderBy: { [sortField]: sortDir },
          skip,
          take: perPage,
        }),
        prisma.eleitor.count({ where }),
      ]);

      return {
        items: items.map(mapEleitor),
        total,
        page,
        perPage,
      };
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao buscar eleitores com filtros.');
    }
  }

  async findEleitorById(id: string): Promise<Eleitor | null> {
    try {
      const eleitor = await prisma.eleitor.findUnique({ where: { id } });
      return eleitor ? mapEleitor(eleitor) : null;
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao buscar eleitor.');
    }
  }

  async createEleitor(data: CreateEleitorInput): Promise<Eleitor> {
    try {
      const eleitor = await prisma.eleitor.create({
        data: {
          nome: data.nome,
          cpf: data.cpf,
          tituloEleitor: data.tituloEleitor,
          sessao: data.sessao,
          zona: data.zona,
          localVotacao: data.localVotacao,
          promessa: data.promessa,
          promessaConcluida: data.promessaConcluida ?? false,
        },
      });

      return mapEleitor(eleitor);
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao criar eleitor.');
    }
  }

  async updateEleitor(id: string, data: UpdateEleitorInput): Promise<Eleitor> {
    try {
      const eleitor = await prisma.eleitor.update({
        where: { id },
        data: {
          nome: data.nome,
          cpf: data.cpf,
          tituloEleitor: data.tituloEleitor,
          sessao: data.sessao,
          zona: data.zona,
          localVotacao: data.localVotacao,
          promessa: data.promessa,
          promessaConcluida: data.promessaConcluida,
        },
      });

      return mapEleitor(eleitor);
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao atualizar eleitor.');
    }
  }

  async deleteEleitor(id: string): Promise<void> {
    try {
      await prisma.eleitor.delete({ where: { id } });
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao remover eleitor.');
    }
  }
}
