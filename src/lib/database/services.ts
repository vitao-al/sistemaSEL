import { Admin, AuthRole, AuthUser, CaboEleitoral, DashboardStats, Eleitor } from '@/types';
import { AppError } from '@/lib/errors';
import { signAuthToken } from '@/lib/auth/jwt';
import {
  CaboQueryParams,
  CreateCaboInput,
  CreateEleitorInput,
  DatabaseAdapter,
  EleitorUniqueCheckInput,
  EleitorUniqueConflict,
  EleitorQueryParams,
  PaginatedCabosResult,
  PaginatedEleitoresResult,
  SessionScope,
  UpdateCaboInput,
  UpdateEleitorInput,
} from './types';

function withoutPassword<T extends { senha: string }>(user: T): Omit<T, 'senha'> {
  const { senha: _senha, ...safeUser } = user;
  return safeUser;
}

function normalizeDigits(value?: string) {
  const digits = value?.replace(/\D/g, '').trim();
  return digits ? digits : undefined;
}

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export class AuthService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async login(email: string, senha: string): Promise<{ user: AuthUser; token: string }> {
    const foundUser = await this.adapter.findAuthUserByCredentials(email, senha);
    if (!foundUser) {
      throw new AppError('UNAUTHORIZED', 401, 'Email ou senha inválidos.');
    }

    if (foundUser.role === 'admin' && !foundUser.adminId) {
      throw new AppError('INTERNAL_ERROR', 500, 'Sessão inválida para admin.');
    }

    if (foundUser.role === 'cabo' && !foundUser.adminId) {
      throw new AppError('INTERNAL_ERROR', 500, 'Sessão inválida para cabo eleitoral.');
    }

    return {
      user: withoutPassword(foundUser),
      token: signAuthToken({
        sub: foundUser.id,
        role: foundUser.role,
        adminId: foundUser.adminId,
      }),
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const foundUser = await this.adapter.findAuthUserByEmail(email);
    if (!foundUser) {
      // Não revela se o email existe: apenas silencia sem erro visível ao cliente.
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[auth] forgot-password ignorado: email não encontrado (${email}).`);
      }
      return;
    }

    // Gera token aleatório e seguro (32 bytes hex = 64 chars).
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    const { RESET_TOKEN_EXPIRY_MINUTES, sendPasswordResetEmail } = await import('@/lib/email/mailer');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // Limpa tokens expirados antes de criar o novo.
    await this.adapter.deleteExpiredPasswordResetTokens();
    await this.adapter.createPasswordResetToken(foundUser.email, foundUser.role, token, expiresAt);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const resetUrl = `${baseUrl}/redefinir-senha/${token}`;

    await sendPasswordResetEmail({
      to: foundUser.email,
      nome: foundUser.nome,
      resetUrl,
    });
  }

  async validateResetToken(token: string): Promise<{ email: string; role: string; expiresAt: Date }> {
    const record = await this.adapter.findPasswordResetToken(token);

    if (!record) {
      throw new AppError('NOT_FOUND', 404, 'Link de recuperação inválido ou já utilizado.');
    }

    if (record.usedAt) {
      throw new AppError('VALIDATION_ERROR', 410, 'Este link já foi utilizado. Solicite um novo.');
    }

    if (new Date() > record.expiresAt) {
      throw new AppError('VALIDATION_ERROR', 410, 'Este link expirou. Solicite um novo link de recuperação.');
    }

    return { email: record.email, role: record.role, expiresAt: record.expiresAt };
  }

  async resetPassword(token: string, novaSenha: string): Promise<void> {
    const { email, role } = await this.validateResetToken(token);

    const foundUser = await this.adapter.findAuthUserByEmail(email);
    if (!foundUser) {
      throw new AppError('NOT_FOUND', 404, 'Usuário não encontrado.');
    }

    await this.adapter.updateAuthUser(role as 'admin' | 'cabo', foundUser.id, { senha: novaSenha });
    await this.adapter.markPasswordResetTokenUsed(token);
  }
}

export class CaboService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async listAdmins(): Promise<Admin[]> {
    return this.adapter.listAdmins();
  }

  async getCabosPage(scope: SessionScope, params: CaboQueryParams): Promise<PaginatedCabosResult> {
    if (scope.role !== 'admin' || !scope.adminId) {
      throw new AppError('FORBIDDEN', 403, 'Apenas admins podem gerenciar cabos eleitorais.');
    }

    return this.adapter.listCabos(scope.adminId, params);
  }

  async createCabo(scope: SessionScope, data: CreateCaboInput): Promise<CaboEleitoral> {
    if (scope.role !== 'admin' || !scope.adminId) {
      throw new AppError('FORBIDDEN', 403, 'Apenas admins podem criar cabos eleitorais.');
    }

    const userWithEmail = await this.adapter.findAuthUserByEmail(data.email);
    if (userWithEmail) {
      throw new AppError('CONFLICT', 409, 'Este email já está em uso.');
    }

    return this.adapter.createCabo(scope.adminId, data);
  }

  async updateCabo(scope: SessionScope, caboId: string, data: UpdateCaboInput): Promise<CaboEleitoral> {
    if (scope.role !== 'admin' || !scope.adminId) {
      throw new AppError('FORBIDDEN', 403, 'Apenas admins podem editar cabos eleitorais.');
    }

    const cabo = await this.adapter.findCaboById(caboId);
    if (!cabo || cabo.adminId !== scope.adminId) {
      throw new AppError('NOT_FOUND', 404, 'Cabo eleitoral não encontrado.');
    }

    if (data.email) {
      const userWithEmail = await this.adapter.findAuthUserByEmail(data.email);
      if (userWithEmail && userWithEmail.id !== caboId) {
        throw new AppError('CONFLICT', 409, 'Este email já está em uso.');
      }
    }

    return this.adapter.updateCabo(caboId, data);
  }

  async deleteCabo(scope: SessionScope, caboId: string): Promise<void> {
    if (scope.role !== 'admin' || !scope.adminId) {
      throw new AppError('FORBIDDEN', 403, 'Apenas admins podem remover cabos eleitorais.');
    }

    const cabo = await this.adapter.findCaboById(caboId);
    if (!cabo || cabo.adminId !== scope.adminId) {
      throw new AppError('NOT_FOUND', 404, 'Cabo eleitoral não encontrado.');
    }

    await this.adapter.deleteCabo(caboId);
  }
}

export class EleitorService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  private sanitizeEleitorInput<T extends CreateEleitorInput | UpdateEleitorInput>(data: T): T {
    return {
      ...data,
      nome: normalizeOptionalText(data.nome),
      cpf: normalizeDigits(data.cpf),
      tituloEleitor: normalizeDigits(data.tituloEleitor),
      sessao: normalizeOptionalText(data.sessao),
      zona: normalizeOptionalText(data.zona),
      localVotacao: normalizeOptionalText(data.localVotacao),
      promessa: normalizeOptionalText(data.promessa),
      caboEleitoralId: normalizeOptionalText(data.caboEleitoralId),
    } as T;
  }

  private async ensureUniqueEleitorData(data: EleitorUniqueCheckInput, excludeId?: string): Promise<void> {
    const conflicts = await this.adapter.findEleitorUniqueConflicts({
      cpf: normalizeDigits(data.cpf),
      tituloEleitor: normalizeDigits(data.tituloEleitor),
      excludeId,
    });

    if (conflicts.length === 0) {
      return;
    }

    const conflictMessages = conflicts.map(conflict =>
      conflict.field === 'cpf'
        ? 'Já existe um eleitor com este CPF.'
        : 'Já existe um eleitor com este título de eleitor.'
    );

    throw new AppError('CONFLICT', 409, conflictMessages.join(' '), { conflicts });
  }

  async getEleitoresPage(scope: SessionScope, params: EleitorQueryParams): Promise<PaginatedEleitoresResult> {
    return this.adapter.queryEleitores(scope, params);
  }

  async getEleitores(scope: SessionScope, caboEleitoralId?: string): Promise<Eleitor[]> {
    const eleitores = await this.adapter.listEleitores(scope, caboEleitoralId);
    return [...eleitores].sort(
      (current, next) => new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()
    );
  }

  async getEleitorById(scope: SessionScope, id: string): Promise<Eleitor | null> {
    return this.adapter.findEleitorById(scope, id);
  }

  async validateUniqueFields(data: EleitorUniqueCheckInput): Promise<{
    cpfAvailable: boolean;
    tituloEleitorAvailable: boolean;
    conflicts: EleitorUniqueConflict[];
  }> {
    const conflicts = await this.adapter.findEleitorUniqueConflicts({
      cpf: normalizeDigits(data.cpf),
      tituloEleitor: normalizeDigits(data.tituloEleitor),
      excludeId: data.excludeId,
    });

    return {
      cpfAvailable: !conflicts.some(conflict => conflict.field === 'cpf'),
      tituloEleitorAvailable: !conflicts.some(conflict => conflict.field === 'tituloEleitor'),
      conflicts,
    };
  }

  async createEleitor(scope: SessionScope, data: CreateEleitorInput): Promise<Eleitor> {
    const sanitized = this.sanitizeEleitorInput(data);
    await this.ensureUniqueEleitorData(sanitized);
    return this.adapter.createEleitor(scope, sanitized);
  }

  async updateEleitor(scope: SessionScope, id: string, data: UpdateEleitorInput): Promise<Eleitor> {
    const sanitized = this.sanitizeEleitorInput(data);
    await this.ensureUniqueEleitorData(sanitized, id);
    return this.adapter.updateEleitor(scope, id, sanitized);
  }

  async deleteEleitor(scope: SessionScope, id: string): Promise<void> {
    await this.adapter.deleteEleitor(scope, id);
  }
}

export class DashboardService {
  constructor(private readonly eleitorService: EleitorService) {}

  private calculateVariation(current: number, previous: number): number {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }

    const variation = ((current - previous) / previous) * 100;
    return Number(variation.toFixed(1));
  }

  async getDashboardStats(scope: SessionScope): Promise<DashboardStats> {
    const allEleitores = await this.eleitorService.getEleitores(scope);
    const eleitoresComPromessa = allEleitores.filter(eleitor => eleitor.promessa);
    const promessasConcluidas = eleitoresComPromessa.filter(eleitor => eleitor.promessaConcluida);
    const promessasPendentes = eleitoresComPromessa.filter(eleitor => !eleitor.promessaConcluida);

    const sortedEleitores = [...allEleitores].sort(
      (current, next) => new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()
    );

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const eleitoresPorMes = months.map((month, monthIndex) => ({
      mes: month,
      total: allEleitores.filter(eleitor => new Date(eleitor.createdAt).getMonth() === monthIndex).length,
    }));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const countByMonth = <T extends { createdAt: string | Date }>(items: T[], year: number, month: number): number =>
      items.filter(item => {
        const createdAt = new Date(item.createdAt);
        return createdAt.getFullYear() === year && createdAt.getMonth() === month;
      }).length;

    const totalCurrentMonth = countByMonth(allEleitores, currentYear, currentMonth);
    const totalPreviousMonth = countByMonth(allEleitores, previousMonthYear, previousMonth);
    const promessasConcluidasCurrentMonth = countByMonth(promessasConcluidas, currentYear, currentMonth);
    const promessasConcluidasPreviousMonth = countByMonth(promessasConcluidas, previousMonthYear, previousMonth);

    const zonasCount: Record<string, number> = {};
    allEleitores.forEach(eleitor => {
      if (eleitor.zona) {
        zonasCount[eleitor.zona] = (zonasCount[eleitor.zona] ?? 0) + 1;
      }
    });

    const zonasMaisAtivas = Object.entries(zonasCount)
      .map(([zona, total]) => ({ zona: `Zona ${zona}`, total }))
      .sort((current, next) => next.total - current.total)
      .slice(0, 5);

    return {
      totalEleitores: allEleitores.length,
      totalEleitoresVariacao: this.calculateVariation(totalCurrentMonth, totalPreviousMonth),
      promessasConcluidas: promessasConcluidas.length,
      promessasConcluidasVariacao: this.calculateVariation(promessasConcluidasCurrentMonth, promessasConcluidasPreviousMonth),
      promessasPendentes: promessasPendentes.length,
      ultimoEleitorAdicionado: sortedEleitores[0],
      eleitoresPorMes,
      promessasPorStatus: [
        { status: 'Concluídas', total: promessasConcluidas.length },
        { status: 'Pendentes', total: promessasPendentes.length },
        { status: 'Sem Promessa', total: allEleitores.length - eleitoresComPromessa.length },
      ],
      zonasMaisAtivas,
    };
  }
}

export class UserService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async updateUserProfile(role: AuthRole, id: string, data: Partial<AuthUser>): Promise<AuthUser> {
    const updatedUser = await this.adapter.updateAuthUser(role, id, data);
    return withoutPassword(updatedUser);
  }

  async updateUserSenha(role: AuthRole, id: string, senhaAtual: string, novaSenha: string): Promise<void> {
    const user = await this.adapter.findAuthUserById(role, id);
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'Usuário não encontrado.');
    }

    if (user.senha !== senhaAtual) {
      throw new AppError('UNAUTHORIZED', 401, 'Senha atual incorreta.');
    }

    await this.adapter.updateAuthUser(role, id, { senha: novaSenha });
  }
}
