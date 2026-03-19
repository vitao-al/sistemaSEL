import { DashboardStats, Eleitor, User } from '@/types';
import { AppError } from '@/lib/errors';
import { CreateEleitorInput, DatabaseAdapter, EleitorQueryParams, PaginatedEleitoresResult, UpdateEleitorInput } from './types';

function withoutPassword(user: User & { senha: string }): User {
  const { senha: _senha, ...safeUser } = user;
  return safeUser;
}

export class AuthService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async login(email: string, senha: string): Promise<{ user: User; token: string }> {
    const foundUser = await this.adapter.findUserByCredentials(email, senha);
    if (!foundUser) {
      throw new AppError('UNAUTHORIZED', 401, 'Email ou senha inválidos.');
    }

    return {
      user: withoutPassword(foundUser),
      token: `mock-token-${foundUser.id}-${Date.now()}`,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const foundUser = await this.adapter.findUserByEmail(email);
    if (!foundUser) {
      throw new AppError('NOT_FOUND', 404, 'Email não encontrado.');
    }
  }
}

export class EleitorService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async getEleitoresPage(userId: string, params: EleitorQueryParams): Promise<PaginatedEleitoresResult> {
    return this.adapter.queryEleitores(userId, params);
  }

  async getEleitores(userId: string): Promise<Eleitor[]> {
    const eleitores = await this.adapter.listEleitores(userId);
    return [...eleitores].sort(
      (current, next) => new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()
    );
  }

  async getEleitorById(userId: string, id: string): Promise<Eleitor | null> {
    return this.adapter.findEleitorById(userId, id);
  }

  async createEleitor(userId: string, data: CreateEleitorInput): Promise<Eleitor> {
    return this.adapter.createEleitor(userId, data);
  }

  async updateEleitor(userId: string, id: string, data: UpdateEleitorInput): Promise<Eleitor> {
    return this.adapter.updateEleitor(userId, id, data);
  }

  async deleteEleitor(userId: string, id: string): Promise<void> {
    await this.adapter.deleteEleitor(userId, id);
  }
}

export class DashboardService {
  constructor(private readonly eleitorService: EleitorService) {}

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const allEleitores = await this.eleitorService.getEleitores(userId);
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
      totalEleitoresVariacao: 12.5,
      promessasConcluidas: promessasConcluidas.length,
      promessasConcluidasVariacao: 8.3,
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

  async updateUserProfile(id: string, data: Partial<User>): Promise<User> {
    const updatedUser = await this.adapter.updateUser(id, data);
    return withoutPassword(updatedUser);
  }

  async updateUserSenha(id: string, senhaAtual: string, novaSenha: string): Promise<void> {
    const user = await this.adapter.findUserById(id);
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'Usuário não encontrado.');
    }

    if (user.senha !== senhaAtual) {
      throw new AppError('UNAUTHORIZED', 401, 'Senha atual incorreta.');
    }

    await this.adapter.updateUser(id, { senha: novaSenha });
  }
}
