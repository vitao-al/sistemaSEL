// Adapter PostgreSQL (Prisma) para operações de admin, cabos eleitorais e eleitores.

import { prisma } from './prisma';
import { AppError } from '@/lib/errors';
import { Admin, CaboEleitoral, Eleitor } from '@/types';
import {
  AuthUserWithPassword,
  CaboQueryParams,
  CreateCaboInput,
  CreateEleitorInput,
  DatabaseAdapter,
  EleitorUniqueCheckInput,
  EleitorUniqueConflict,
  EleitorQueryParams,
  PaginatedCabosResult,
  PaginatedEleitoresResult,
  PasswordResetTokenRecord,
  SessionScope,
  UpdateCaboInput,
  UpdateEleitorInput,
} from './types';

function mapAdmin(record: {
  id: string;
  nome: string;
  email: string;
  avatar: string | null;
  cargo: string | null;
  createdAt: Date;
}): Admin {
  return {
    id: record.id,
    nome: record.nome,
    email: record.email,
    avatar: record.avatar ?? undefined,
    cargo: record.cargo ?? undefined,
    createdAt: record.createdAt.toISOString(),
  };
}

function mapCabo(record: {
  id: string;
  adminId: string;
  liderId?: string | null;
  nome: string;
  titulo: string;
  zona: string;
  email: string;
  telefone: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
  admin?: { id: string; nome: string; email: string } | null;
  lider?: { id: string; nome: string; email?: string | null; cor?: string | null } | null;
}): CaboEleitoral {
  return {
    id: record.id,
    adminId: record.adminId,
    liderId: record.liderId ?? undefined,
    nome: record.nome,
    titulo: record.titulo,
    zona: record.zona,
    email: record.email,
    telefone: record.telefone ?? undefined,
    avatar: record.avatar ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    admin: record.admin ?? undefined,
    lider: record.lider ? { id: record.lider.id, nome: record.lider.nome, cor: record.lider.cor ?? undefined } : undefined,
    liderNome: record.lider?.nome ?? undefined,
    liderCor: record.lider?.cor ?? undefined,
  };
}

function mapLider(record: {
  id: string;
  adminId: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  avatar: string | null;
  cor: string | null;
  createdAt: Date;
  updatedAt: Date;
  admin?: { id: string; nome: string; email: string };
}): import('@/types').Lider {
  return {
    id: record.id,
    adminId: record.adminId,
    nome: record.nome,
    email: record.email ?? undefined,
    telefone: record.telefone ?? undefined,
    cargo: record.cargo ?? undefined,
    avatar: record.avatar ?? undefined,
    cor: record.cor ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    admin: record.admin,
  };
}

function mapEleitor(record: {
  id: string;
  caboEleitoralId: string;
  nome: string | null;
  cpf: string | null;
  tituloEleitor: string | null;
  telefone: string | null;
  sessao: string | null;
  zona: string | null;
  localVotacao: string | null;
  promessa: string | null;
  promessaConcluida: boolean;
  createdAt: Date;
  updatedAt: Date;
  caboEleitoral?: {
    id: string;
    nome: string;
    titulo: string;
    zona: string;
    adminId: string;
    lider?: { id: string; nome: string; cor?: string | null } | null;
  };
}): Eleitor {
  return {
    id: record.id,
    caboEleitoralId: record.caboEleitoralId,
    nome: record.nome ?? undefined,
    cpf: record.cpf ?? undefined,
    tituloEleitor: record.tituloEleitor ?? undefined,
    telefone: record.telefone ?? undefined,
    sessao: record.sessao ?? undefined,
    zona: record.zona ?? undefined,
    localVotacao: record.localVotacao ?? undefined,
    promessa: record.promessa ?? undefined,
    promessaConcluida: record.promessaConcluida,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    caboEleitoral: record.caboEleitoral ? {
      ...record.caboEleitoral,
      liderNome: record.caboEleitoral.lider?.nome ?? undefined,
      liderCor: record.caboEleitoral.lider?.cor ?? undefined,
    } : undefined,
    liderNome: record.caboEleitoral?.lider?.nome ?? undefined,
    liderCor: record.caboEleitoral?.lider?.cor ?? undefined,
  };
}

export class PostgresDatabaseAdapter implements DatabaseAdapter {
  private buildEleitorWhere(scope: SessionScope, params: EleitorQueryParams) {
    const where: Record<string, unknown> = {};

    const targetCaboId = scope.role === 'admin'
      ? (params.caboEleitoralId || undefined)
      : scope.caboId;

    if (targetCaboId) where.caboEleitoralId = targetCaboId;
    else if (scope.role === 'admin' && scope.adminId) where.caboEleitoral = { adminId: scope.adminId };

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

    if (params.zona) where.zona = params.zona;
    if (params.promessa === 'concluida') where.AND = [{ promessa: { not: null } }, { promessaConcluida: true }];
    if (params.promessa === 'pendente') where.AND = [{ promessa: { not: null } }, { promessaConcluida: false }];
    if (params.promessa === 'sem') where.promessa = null;

    return where;
  }

  async findAuthUserByCredentials(email: string, senha: string): Promise<AuthUserWithPassword | null> {
    try {
      const admin = await prisma.admin.findFirst({ where: { email, senha } });
      if (!admin) return null;

      return {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        senha: admin.senha,
        avatar: admin.avatar ?? undefined,
        cargo: admin.cargo ?? 'Admin',
        role: 'admin',
        adminId: admin.id,
        createdAt: admin.createdAt.toISOString(),
      };
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao autenticar usuário.');
    }
  }

  async findAuthUserByEmail(email: string): Promise<AuthUserWithPassword | null> {
    try {
      const admin = await prisma.admin.findUnique({ where: { email } });
      if (!admin) return null;

      return {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        senha: admin.senha,
        avatar: admin.avatar ?? undefined,
        cargo: admin.cargo ?? 'Admin',
        role: 'admin',
        adminId: admin.id,
        createdAt: admin.createdAt.toISOString(),
      };
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao buscar usuário por email.');
    }
  }

  async findAuthUserById(role: 'admin' | 'cabo', id: string): Promise<AuthUserWithPassword | null> {
    try {
      if (role !== 'admin') {
        return null;
      }

      const admin = await prisma.admin.findUnique({ where: { id } });
      if (!admin) return null;

      return {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        senha: admin.senha,
        avatar: admin.avatar ?? undefined,
        cargo: admin.cargo ?? 'Admin',
        role: 'admin',
        adminId: admin.id,
        createdAt: admin.createdAt.toISOString(),
      };
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao buscar usuário.');
    }
  }

  async updateAuthUser(role: 'admin' | 'cabo', id: string, data: Partial<AuthUserWithPassword>): Promise<AuthUserWithPassword> {
    try {
      if (role !== 'admin') {
        throw new AppError('FORBIDDEN', 403, 'Cabo eleitoral não possui acesso de login.');
      }

      const updated = await prisma.admin.update({
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
        cargo: updated.cargo ?? 'Admin',
        role: 'admin',
        adminId: updated.id,
        createdAt: updated.createdAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao atualizar usuário.');
    }
  }

  async listAdmins(): Promise<Admin[]> {
    const admins = await prisma.admin.findMany({ orderBy: { nome: 'asc' } });
    return admins.map(mapAdmin);
  }

  async listLideres(adminId: string, params: { search?: string; page: number; perPage: number }): Promise<any> {
    const page = Math.max(1, params.page);
    const perPage = Math.max(1, params.perPage);
    const skip = (page - 1) * perPage;

    const where: Record<string, unknown> = { adminId };
    if (params.search) {
      where.OR = [{ nome: { contains: params.search, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      prisma.lider.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { id: true, nome: true, email: true } } },
      }),
      prisma.lider.count({ where }),
    ]);

    return { items: items.map(mapLider), total, page, perPage };
  }

  async findLiderById(id: string): Promise<import('@/types').Lider | null> {
    const lider = await prisma.lider.findUnique({
      where: { id },
      include: { admin: { select: { id: true, nome: true, email: true } } },
    });

    return lider ? mapLider(lider) : null;
  }

  async createLider(adminId: string, data: { nome: string; email?: string; telefone?: string; cargo?: string; avatar?: string; cor?: string }): Promise<import('@/types').Lider> {
    try {
      const payload: Record<string, unknown> = { adminId, nome: data.nome };
      if (data.email) payload.email = data.email;
      if (data.telefone) payload.telefone = data.telefone;
      if (data.cargo) payload.cargo = data.cargo;
      if (data.avatar) payload.avatar = data.avatar;
      if (data.cor) payload.cor = data.cor;

      const lider = await prisma.lider.create({
        data: payload as any,
      });
      return mapLider(lider);
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao criar liderança.');
    }
  }

  async updateLider(id: string, data: { nome?: string; email?: string; telefone?: string; cargo?: string; avatar?: string; cor?: string }): Promise<import('@/types').Lider> {
    try {
      const payload: Record<string, unknown> = {};
      if (data.nome !== undefined) payload.nome = data.nome;
      if (data.email !== undefined) payload.email = data.email || null;
      if (data.telefone !== undefined) payload.telefone = data.telefone || null;
      if (data.cargo !== undefined) payload.cargo = data.cargo || null;
      if (data.avatar !== undefined) payload.avatar = data.avatar || null;
      if (data.cor !== undefined) payload.cor = data.cor || null;

      const lider = await prisma.lider.update({
        where: { id },
        data: payload as any,
      });
      return mapLider(lider);
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao atualizar liderança.');
    }
  }

  async deleteLider(id: string): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        await tx.caboEleitoral.updateMany({
          where: { liderId: id },
          data: { liderId: null },
        });

        await tx.lider.delete({ where: { id } });
      });
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao remover liderança.');
    }
  }

  async listCabos(adminId: string, params: CaboQueryParams): Promise<PaginatedCabosResult> {
    const page = Math.max(1, params.page);
    const perPage = Math.max(1, params.perPage);
    const skip = (page - 1) * perPage;

    const where: Record<string, unknown> = { adminId };
    if (params.liderId) {
      where.liderId = params.liderId;
    }
    if (params.search) {
      where.OR = [
        { nome: { contains: params.search, mode: 'insensitive' } },
        { titulo: { contains: params.search, mode: 'insensitive' } },
        { zona: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.caboEleitoral.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { id: true, nome: true, email: true } },
          lider: { select: { id: true, nome: true, email: true, cor: true } },
        },
      }),
      prisma.caboEleitoral.count({ where }),
    ]);

    return { items: items.map(mapCabo), total, page, perPage };
  }

  async findCaboById(id: string): Promise<CaboEleitoral | null> {
    const cabo = await prisma.caboEleitoral.findUnique({
      where: { id },
      include: {
        admin: { select: { id: true, nome: true, email: true } },
        lider: { select: { id: true, nome: true, email: true } },
      },
    });

    return cabo ? mapCabo(cabo) : null;
  }

  async createCabo(adminId: string, data: CreateCaboInput): Promise<CaboEleitoral> {
    try {
      const cabo = await prisma.caboEleitoral.create({
        data: {
          adminId,
          liderId: data.liderId || null,
          nome: data.nome,
          titulo: data.titulo,
          zona: data.zona,
          email: data.email,
          telefone: data.telefone,
          senha: data.senha ?? '',
        },
      });

      return mapCabo(cabo);
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao criar cabo eleitoral.');
    }
  }

  async updateCabo(id: string, data: UpdateCaboInput): Promise<CaboEleitoral> {
    try {
      const cabo = await prisma.caboEleitoral.update({
        where: { id },
        data: {
          liderId: data.liderId ?? undefined,
          nome: data.nome,
          titulo: data.titulo,
          zona: data.zona,
          email: data.email,
          telefone: data.telefone,
          senha: data.senha,
        },
      });

      return mapCabo(cabo);
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao atualizar cabo eleitoral.');
    }
  }

  async deleteCabo(id: string): Promise<void> {
    try {
      await prisma.caboEleitoral.delete({ where: { id } });
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao remover cabo eleitoral.');
    }
  }

  async listEleitores(scope: SessionScope, caboEleitoralId?: string): Promise<Eleitor[]> {
    const where: Record<string, unknown> = {};

    if (scope.role === 'cabo' && scope.caboId) {
      where.caboEleitoralId = scope.caboId;
    } else if (scope.role === 'admin' && scope.adminId) {
      if (caboEleitoralId) where.caboEleitoralId = caboEleitoralId;
      else where.caboEleitoral = { adminId: scope.adminId };
    }

    const eleitores = await prisma.eleitor.findMany({
      where,
      include: {
        caboEleitoral: {
          select: {
            id: true,
            nome: true,
            titulo: true,
            zona: true,
            adminId: true,
            lider: { select: { id: true, nome: true, cor: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return eleitores.map(mapEleitor);
  }

  async queryEleitores(scope: SessionScope, params: EleitorQueryParams): Promise<PaginatedEleitoresResult> {
    const page = Math.max(1, params.page);
    const perPage = Math.max(1, params.perPage);
    const skip = (page - 1) * perPage;
    const sortField = params.sortField ?? 'createdAt';
    const sortDir = params.sortDir ?? 'desc';

    const where = this.buildEleitorWhere(scope, params);

    const [items, total] = await Promise.all([
      prisma.eleitor.findMany({
        where,
        orderBy: { [sortField]: sortDir },
        skip,
        take: perPage,
        include: {
          caboEleitoral: {
            select: {
              id: true,
              nome: true,
              titulo: true,
              zona: true,
              adminId: true,
              lider: { select: { id: true, nome: true, cor: true } },
            },
          },
        },
      }),
      prisma.eleitor.count({ where }),
    ]);

    return {
      items: items.map(mapEleitor),
      total,
      page,
      perPage,
    };
  }

  async findEleitorById(scope: SessionScope, id: string): Promise<Eleitor | null> {
    const where = this.buildEleitorWhere(scope, { page: 1, perPage: 1 });
    const eleitor = await prisma.eleitor.findFirst({
      where: { ...where, id },
      include: {
        caboEleitoral: {
          select: {
            id: true,
            nome: true,
            titulo: true,
            zona: true,
            adminId: true,
            lider: { select: { id: true, nome: true, cor: true } },
          },
        },
      },
    });

    return eleitor ? mapEleitor(eleitor) : null;
  }

  async findEleitorUniqueConflicts(input: EleitorUniqueCheckInput): Promise<EleitorUniqueConflict[]> {
    const orConditions: Array<Record<string, string>> = [];

    if (input.cpf) {
      orConditions.push({ cpf: input.cpf });
    }

    if (input.tituloEleitor) {
      orConditions.push({ tituloEleitor: input.tituloEleitor });
    }

    if (orConditions.length === 0) {
      return [];
    }

    try {
      const eleitores = await prisma.eleitor.findMany({
        where: {
          OR: orConditions,
          ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
        },
        select: {
          id: true,
          nome: true,
          cpf: true,
          tituloEleitor: true,
        },
      });

      const conflicts: EleitorUniqueConflict[] = [];

      eleitores.forEach(eleitor => {
        if (input.cpf && eleitor.cpf === input.cpf) {
          conflicts.push({ id: eleitor.id, field: 'cpf', value: input.cpf, nome: eleitor.nome ?? undefined });
        }

        if (input.tituloEleitor && eleitor.tituloEleitor === input.tituloEleitor) {
          conflicts.push({ id: eleitor.id, field: 'tituloEleitor', value: input.tituloEleitor, nome: eleitor.nome ?? undefined });
        }
      });

      return conflicts;
    } catch {
      throw new AppError('DATABASE_ERROR', 500, 'Falha ao validar CPF e título de eleitor.');
    }
  }

  async createEleitor(scope: SessionScope, data: CreateEleitorInput): Promise<Eleitor> {
    const caboEleitoralId = scope.role === 'admin'
      ? data.caboEleitoralId
      : scope.caboId;

    if (!caboEleitoralId) {
      throw new AppError('VALIDATION_ERROR', 400, 'Cabo eleitoral obrigatório para criar eleitor.');
    }

    const cabo = await prisma.caboEleitoral.findUnique({ where: { id: caboEleitoralId } });
    if (!cabo) {
      throw new AppError('NOT_FOUND', 404, 'Cabo eleitoral não encontrado.');
    }

    if (scope.role === 'admin' && cabo.adminId !== scope.adminId) {
      throw new AppError('FORBIDDEN', 403, 'Cabo eleitoral não pertence ao admin autenticado.');
    }

    if (scope.role === 'cabo' && cabo.id !== scope.caboId) {
      throw new AppError('FORBIDDEN', 403, 'Cabo eleitoral inválido para este usuário.');
    }

    const eleitor = await prisma.eleitor.create({
      data: {
        caboEleitoralId,
        nome: data.nome,
        cpf: data.cpf,
        tituloEleitor: data.tituloEleitor,
        telefone: data.telefone,
        sessao: data.sessao,
        zona: data.zona,
        localVotacao: data.localVotacao,
        promessa: data.promessa,
        promessaConcluida: data.promessaConcluida ?? false,
      },
      include: {
        caboEleitoral: {
          select: { id: true, nome: true, titulo: true, zona: true, adminId: true },
        },
      },
    });

    return mapEleitor(eleitor);
  }

  async updateEleitor(scope: SessionScope, id: string, data: UpdateEleitorInput): Promise<Eleitor> {
    const existing = await this.findEleitorById(scope, id);
    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Eleitor não encontrado.');
    }

    let caboEleitoralId = existing.caboEleitoralId;
    if (scope.role === 'admin' && data.caboEleitoralId) {
      const cabo = await prisma.caboEleitoral.findUnique({ where: { id: data.caboEleitoralId } });
      if (!cabo || cabo.adminId !== scope.adminId) {
        throw new AppError('FORBIDDEN', 403, 'Cabo eleitoral inválido.');
      }
      caboEleitoralId = data.caboEleitoralId;
    }

    const eleitor = await prisma.eleitor.update({
      where: { id },
      data: {
        caboEleitoralId,
        nome: data.nome,
        cpf: data.cpf,
        tituloEleitor: data.tituloEleitor,
        telefone: data.telefone,
        sessao: data.sessao,
        zona: data.zona,
        localVotacao: data.localVotacao,
        promessa: data.promessa,
        promessaConcluida: data.promessaConcluida,
      },
      include: {
        caboEleitoral: {
          select: { id: true, nome: true, titulo: true, zona: true, adminId: true },
        },
      },
    });

    return mapEleitor(eleitor);
  }

  async deleteEleitor(scope: SessionScope, id: string): Promise<void> {
    const existing = await this.findEleitorById(scope, id);
    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Eleitor não encontrado.');
    }

    await prisma.eleitor.delete({ where: { id } });
  }

  // ── Token de recuperação de senha ──

  async createPasswordResetToken(email: string, role: string, token: string, expiresAt: Date): Promise<void> {
    await prisma.passwordResetToken.create({
      data: { email, role, token, expiresAt },
    });
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetTokenRecord | null> {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record) return null;
    return {
      id: record.id,
      token: record.token,
      email: record.email,
      role: record.role,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    };
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
