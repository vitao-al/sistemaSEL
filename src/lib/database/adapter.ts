import { Eleitor, User } from '@/types';
import {
  CreateEleitorInput,
  DatabaseAdapter,
  EleitorQueryParams,
  PaginatedEleitoresResult,
  UpdateEleitorInput,
  UserWithPassword,
} from './types';
import { PostgresDatabaseAdapter } from './postgres-adapter';

const STORAGE_KEY_USERS = 'voterapp-users';
const STORAGE_KEY_ELEITORES = 'voterapp-eleitores';

const DEFAULT_USERS: UserWithPassword[] = [
  {
    id: '1',
    nome: 'Manuel Almeida Pinto',
    email: 'leunam@hotmal.com',
    senha: '123456',
    cargo: 'Vereador',
    avatar: 'leunamprofile.png',
    createdAt: '2026-03-15T10:00:00Z',
  },
];

const DEFAULT_ELEITORES: Eleitor[] = [];

export class LocalStorageDatabaseAdapter implements DatabaseAdapter {
  private usersFallback: UserWithPassword[] = [...DEFAULT_USERS];
  private eleitoresFallback: Eleitor[] = [...DEFAULT_ELEITORES];

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private readUsers(): UserWithPassword[] {
    if (!this.isBrowser()) return [...this.usersFallback];

    try {
      const storedUsers = localStorage.getItem(STORAGE_KEY_USERS);
      if (!storedUsers) return [...DEFAULT_USERS];
      const parsedUsers = JSON.parse(storedUsers) as UserWithPassword[];
      if (!Array.isArray(parsedUsers) || parsedUsers.length === 0) return [...DEFAULT_USERS];
      return parsedUsers;
    } catch {
      return [...DEFAULT_USERS];
    }
  }

  private writeUsers(users: UserWithPassword[]): void {
    if (!this.isBrowser()) {
      this.usersFallback = [...users];
      return;
    }

    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }

  private readEleitores(): Eleitor[] {
    if (!this.isBrowser()) return [...this.eleitoresFallback];

    try {
      const storedEleitores = localStorage.getItem(STORAGE_KEY_ELEITORES);
      if (!storedEleitores) return [...DEFAULT_ELEITORES];
      const parsedEleitores = JSON.parse(storedEleitores) as Eleitor[];
      if (!Array.isArray(parsedEleitores)) return [...DEFAULT_ELEITORES];
      return parsedEleitores;
    } catch {
      return [...DEFAULT_ELEITORES];
    }
  }

  private writeEleitores(eleitores: Eleitor[]): void {
    if (!this.isBrowser()) {
      this.eleitoresFallback = [...eleitores];
      return;
    }

    localStorage.setItem(STORAGE_KEY_ELEITORES, JSON.stringify(eleitores));
  }

  async findUserByCredentials(email: string, senha: string): Promise<UserWithPassword | null> {
    const users = this.readUsers();
    return users.find(user => user.email === email && user.senha === senha) ?? null;
  }

  async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    const users = this.readUsers();
    return users.find(user => user.email === email) ?? null;
  }

  async findUserById(id: string): Promise<UserWithPassword | null> {
    const users = this.readUsers();
    return users.find(user => user.id === id) ?? null;
  }

  async updateUser(id: string, data: Partial<UserWithPassword>): Promise<UserWithPassword> {
    const users = this.readUsers();
    const userIndex = users.findIndex(user => user.id === id);

    if (userIndex === -1) {
      throw new Error('Usuário não encontrado.');
    }

    const updatedUser = { ...users[userIndex], ...data };
    users[userIndex] = updatedUser;
    this.writeUsers(users);

    return updatedUser;
  }

  async listEleitores(): Promise<Eleitor[]> {
    return this.readEleitores();
  }

  async queryEleitores(params: EleitorQueryParams): Promise<PaginatedEleitoresResult> {
    const {
      search = '',
      zona = '',
      promessa = '',
      sortField = 'createdAt',
      sortDir = 'desc',
      page,
      perPage,
    } = params;

    let arr = [...this.readEleitores()];

    if (search) {
      const normalizedSearch = search.toLowerCase();
      arr = arr.filter(eleitor =>
        (eleitor.nome ?? '').toLowerCase().includes(normalizedSearch) ||
        (eleitor.cpf ?? '').toLowerCase().includes(normalizedSearch) ||
        (eleitor.tituloEleitor ?? '').toLowerCase().includes(normalizedSearch) ||
        (eleitor.sessao ?? '').toLowerCase().includes(normalizedSearch) ||
        (eleitor.zona ?? '').toLowerCase().includes(normalizedSearch) ||
        (eleitor.localVotacao ?? '').toLowerCase().includes(normalizedSearch) ||
        (eleitor.promessa ?? '').toLowerCase().includes(normalizedSearch)
      );
    }

    if (zona) {
      arr = arr.filter(eleitor => eleitor.zona === zona);
    }

    if (promessa === 'concluida') {
      arr = arr.filter(eleitor => eleitor.promessa && eleitor.promessaConcluida);
    } else if (promessa === 'pendente') {
      arr = arr.filter(eleitor => eleitor.promessa && !eleitor.promessaConcluida);
    } else if (promessa === 'sem') {
      arr = arr.filter(eleitor => !eleitor.promessa);
    }

    arr.sort((current, next) => {
      let currentValue = '';
      let nextValue = '';

      if (sortField === 'nome') {
        currentValue = current.nome ?? '';
        nextValue = next.nome ?? '';
      } else if (sortField === 'zona') {
        currentValue = current.zona ?? '';
        nextValue = next.zona ?? '';
      } else {
        currentValue = current.createdAt;
        nextValue = next.createdAt;
      }

      return sortDir === 'asc' ? currentValue.localeCompare(nextValue) : nextValue.localeCompare(currentValue);
    });

    const total = arr.length;
    const safePage = Math.max(1, page);
    const safePerPage = Math.max(1, perPage);
    const start = (safePage - 1) * safePerPage;
    const end = start + safePerPage;

    return {
      items: arr.slice(start, end),
      total,
      page: safePage,
      perPage: safePerPage,
    };
  }

  async findEleitorById(id: string): Promise<Eleitor | null> {
    const eleitores = this.readEleitores();
    return eleitores.find(eleitor => eleitor.id === id) ?? null;
  }

  async createEleitor(data: CreateEleitorInput): Promise<Eleitor> {
    const eleitores = this.readEleitores();

    const eleitor: Eleitor = {
      ...data,
      id: `eleitor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    eleitores.unshift(eleitor);
    this.writeEleitores(eleitores);

    return eleitor;
  }

  async updateEleitor(id: string, data: UpdateEleitorInput): Promise<Eleitor> {
    const eleitores = this.readEleitores();
    const eleitorIndex = eleitores.findIndex(eleitor => eleitor.id === id);

    if (eleitorIndex === -1) {
      throw new Error('Eleitor não encontrado.');
    }

    const updatedEleitor: Eleitor = {
      ...eleitores[eleitorIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    eleitores[eleitorIndex] = updatedEleitor;
    this.writeEleitores(eleitores);

    return updatedEleitor;
  }

  async deleteEleitor(id: string): Promise<void> {
    const eleitores = this.readEleitores();
    const filteredEleitores = eleitores.filter(eleitor => eleitor.id !== id);
    this.writeEleitores(filteredEleitores);
  }
}

type AdapterRuntime = 'server' | 'client';

type AdapterOptions = {
  runtime?: AdapterRuntime;
};

export function createDatabaseAdapter(options: AdapterOptions = {}): DatabaseAdapter {
  const runtime = options.runtime ?? (typeof window === 'undefined' ? 'server' : 'client');

  if (runtime === 'server') {
    const wantsPostgres = process.env.DATABASE_PROVIDER === 'postgres';
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
    const allowFallback = process.env.DATABASE_FALLBACK_TO_MEMORY === 'true';

    if (wantsPostgres && hasDatabaseUrl) {
      return new PostgresDatabaseAdapter();
    }

    if (!allowFallback && wantsPostgres) {
      throw new Error('DATABASE_URL não configurada e fallback em memória desabilitado.');
    }

    return new LocalStorageDatabaseAdapter();
  }

  return new LocalStorageDatabaseAdapter();
}
