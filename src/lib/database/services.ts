import { DashboardStats, Eleitor, User } from '@/types';
import { AppError } from '@/lib/errors';
import { CreateEleitorInput, DatabaseAdapter, EleitorQueryParams, PaginatedEleitoresResult, UpdateEleitorInput } from './types';

// Remove a senha do objeto de usuário antes de devolver para camadas externas.
function withoutPassword(user: User & { senha: string }): User {
  const { senha: _senha, ...safeUser } = user;
  return safeUser;
}

// =========================
// Serviço de autenticação
// =========================
export class AuthService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  // Realiza login validando credenciais no adapter de dados.
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

  // Fluxo de recuperação: valida apenas existência do email.
  async forgotPassword(email: string): Promise<void> {
    const foundUser = await this.adapter.findUserByEmail(email);
    if (!foundUser) {
      throw new AppError('NOT_FOUND', 404, 'Email não encontrado.');
    }
  }
}

// =========================
// Serviço de eleitores
// =========================
export class EleitorService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  // Lista paginada de eleitores do usuário autenticado.
  async getEleitoresPage(userId: string, params: EleitorQueryParams): Promise<PaginatedEleitoresResult> {
    return this.adapter.queryEleitores(userId, params);
  }

  // Lista completa (ordenada) de eleitores do usuário autenticado.
  async getEleitores(userId: string): Promise<Eleitor[]> {
    const eleitores = await this.adapter.listEleitores(userId);
    return [...eleitores].sort(
      (current, next) => new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()
    );
  }

  // Busca eleitor específico respeitando escopo por usuário.
  async getEleitorById(userId: string, id: string): Promise<Eleitor | null> {
    return this.adapter.findEleitorById(userId, id);
  }

  // Cria eleitor vinculado ao usuário autenticado.
  async createEleitor(userId: string, data: CreateEleitorInput): Promise<Eleitor> {
    return this.adapter.createEleitor(userId, data);
  }

  // Atualiza eleitor do usuário autenticado.
  async updateEleitor(userId: string, id: string, data: UpdateEleitorInput): Promise<Eleitor> {
    return this.adapter.updateEleitor(userId, id, data);
  }

  // Remove eleitor do usuário autenticado.
  async deleteEleitor(userId: string, id: string): Promise<void> {
    await this.adapter.deleteEleitor(userId, id);
  }
}

// =========================
// Serviço de dashboard
// =========================
export class DashboardService {
  constructor(private readonly eleitorService: EleitorService) {}

  // Calcula variação percentual entre período atual e anterior.
  private calculateVariation(current: number, previous: number): number {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }

    const variation = ((current - previous) / previous) * 100;
    return Number(variation.toFixed(1));
  }

  // Consolida os indicadores exibidos no dashboard do usuário autenticado.
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    // Base principal de dados do usuário.
    const allEleitores = await this.eleitorService.getEleitores(userId);

    // Particionamento de promessas para indicadores e gráficos.
    const eleitoresComPromessa = allEleitores.filter(eleitor => eleitor.promessa);
    const promessasConcluidas = eleitoresComPromessa.filter(eleitor => eleitor.promessaConcluida);
    const promessasPendentes = eleitoresComPromessa.filter(eleitor => !eleitor.promessaConcluida);

    // Último eleitor adicionado (para card de destaque).
    const sortedEleitores = [...allEleitores].sort(
      (current, next) => new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()
    );

    // Série anual de cadastros por mês.
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const eleitoresPorMes = months.map((month, monthIndex) => ({
      mes: month,
      total: allEleitores.filter(eleitor => new Date(eleitor.createdAt).getMonth() === monthIndex).length,
    }));

    // Referência temporal para comparar mês atual vs mês anterior.
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Helper interno para contar registros por ano/mês.
    const countByMonth = <T extends { createdAt: string | Date }>(
      items: T[],
      year: number,
      month: number,
    ): number =>
      items.filter(item => {
        const createdAt = new Date(item.createdAt);
        return createdAt.getFullYear() === year && createdAt.getMonth() === month;
      }).length;

    // Quantidade de novos eleitores no mês atual e anterior.
    const totalCurrentMonth = countByMonth(allEleitores, currentYear, currentMonth);
    const totalPreviousMonth = countByMonth(allEleitores, previousMonthYear, previousMonth);

    // Quantidade de promessas concluídas no mês atual e anterior.
    const promessasConcluidasCurrentMonth = countByMonth(promessasConcluidas, currentYear, currentMonth);

    const promessasConcluidasPreviousMonth = countByMonth(promessasConcluidas, previousMonthYear, previousMonth);

    // Ranking de zonas por volume de eleitores.
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

    // Payload final que abastece os cards e gráficos do dashboard.
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

// =========================
// Serviço de usuário
// =========================
export class UserService {
  constructor(private readonly adapter: DatabaseAdapter) {}

  // Atualiza dados de perfil do usuário.
  async updateUserProfile(id: string, data: Partial<User>): Promise<User> {
    const updatedUser = await this.adapter.updateUser(id, data);
    return withoutPassword(updatedUser);
  }

  // Atualiza senha com validação da senha atual.
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
