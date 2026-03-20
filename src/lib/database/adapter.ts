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
import { PostgresDatabaseAdapter } from './postgres-adapter';
import { AppError } from '@/lib/errors';

const STORAGE_KEY_ADMINS = 'voterapp-admins';
const STORAGE_KEY_CABOS = 'voterapp-cabos';
const STORAGE_KEY_ELEITORES = 'voterapp-eleitores';

const DEFAULT_ADMINS: (Admin & { senha: string })[] = [
  {
    id: 'admin-1',
    nome: 'Administrador Geral',
    email: 'admin@sistemasel.com',
    senha: '123456',
    cargo: 'Admin',
    avatar: 'leunamprofile.png',
    createdAt: '2026-03-15T10:00:00Z',
  },
];

const DEFAULT_CABOS: (CaboEleitoral & { senha: string })[] = [
  {
    id: 'cabo-1',
    adminId: 'admin-1',
    nome: 'Carlos Andrade',
    titulo: '111122223333',
    zona: '01',
    email: 'cabo1@sistemasel.com',
    senha: '123456',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-15T10:00:00Z',
  },
];

const DEFAULT_ELEITORES: Eleitor[] = [];

export class LocalStorageDatabaseAdapter implements DatabaseAdapter {
  private adminsFallback = [...DEFAULT_ADMINS];
  private cabosFallback = [...DEFAULT_CABOS];
  private eleitoresFallback = [...DEFAULT_ELEITORES];

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private readAdmins(): (Admin & { senha: string })[] {
    if (!this.isBrowser()) return [...this.adminsFallback];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ADMINS);
      if (!raw) return [...DEFAULT_ADMINS];
      return JSON.parse(raw);
    } catch {
      return [...DEFAULT_ADMINS];
    }
  }

  private writeAdmins(items: (Admin & { senha: string })[]): void {
    if (!this.isBrowser()) {
      this.adminsFallback = [...items];
      return;
    }
    localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(items));
  }

  private readCabos(): (CaboEleitoral & { senha: string })[] {
    if (!this.isBrowser()) return [...this.cabosFallback];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CABOS);
      if (!raw) return [...DEFAULT_CABOS];
      return JSON.parse(raw);
    } catch {
      return [...DEFAULT_CABOS];
    }
  }

  private writeCabos(items: (CaboEleitoral & { senha: string })[]): void {
    if (!this.isBrowser()) {
      this.cabosFallback = [...items];
      return;
    }
    localStorage.setItem(STORAGE_KEY_CABOS, JSON.stringify(items));
  }

  private readEleitores(): Eleitor[] {
    if (!this.isBrowser()) return [...this.eleitoresFallback];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ELEITORES);
      if (!raw) return [...DEFAULT_ELEITORES];
      return JSON.parse(raw);
    } catch {
      return [...DEFAULT_ELEITORES];
    }
  }

  private writeEleitores(items: Eleitor[]): void {
    if (!this.isBrowser()) {
      this.eleitoresFallback = [...items];
      return;
    }
    localStorage.setItem(STORAGE_KEY_ELEITORES, JSON.stringify(items));
  }

  async findAuthUserByCredentials(email: string, senha: string): Promise<AuthUserWithPassword | null> {
    const admin = this.readAdmins().find(item => item.email === email && item.senha === senha);
    if (admin) {
      return { ...admin, role: 'admin', adminId: admin.id };
    }

    const cabo = this.readCabos().find(item => item.email === email && item.senha === senha);
    if (!cabo) return null;

    return {
      id: cabo.id,
      nome: cabo.nome,
      email: cabo.email,
      senha: cabo.senha,
      avatar: cabo.avatar,
      cargo: 'Cabo Eleitoral',
      role: 'cabo',
      adminId: cabo.adminId,
      createdAt: cabo.createdAt,
    };
  }

  async findAuthUserByEmail(email: string): Promise<AuthUserWithPassword | null> {
    const admin = this.readAdmins().find(item => item.email === email);
    if (admin) return { ...admin, role: 'admin', adminId: admin.id };

    const cabo = this.readCabos().find(item => item.email === email);
    if (!cabo) return null;

    return {
      id: cabo.id,
      nome: cabo.nome,
      email: cabo.email,
      senha: cabo.senha,
      avatar: cabo.avatar,
      cargo: 'Cabo Eleitoral',
      role: 'cabo',
      adminId: cabo.adminId,
      createdAt: cabo.createdAt,
    };
  }

  async findAuthUserById(role: 'admin' | 'cabo', id: string): Promise<AuthUserWithPassword | null> {
    if (role === 'admin') {
      const admin = this.readAdmins().find(item => item.id === id);
      return admin ? { ...admin, role: 'admin', adminId: admin.id } : null;
    }

    const cabo = this.readCabos().find(item => item.id === id);
    if (!cabo) return null;

    return {
      id: cabo.id,
      nome: cabo.nome,
      email: cabo.email,
      senha: cabo.senha,
      avatar: cabo.avatar,
      cargo: 'Cabo Eleitoral',
      role: 'cabo',
      adminId: cabo.adminId,
      createdAt: cabo.createdAt,
    };
  }

  async updateAuthUser(role: 'admin' | 'cabo', id: string, data: Partial<AuthUserWithPassword>): Promise<AuthUserWithPassword> {
    if (role === 'admin') {
      const admins = this.readAdmins();
      const index = admins.findIndex(item => item.id === id);
      if (index === -1) throw new Error('Admin não encontrado.');
      admins[index] = { ...admins[index], ...data };
      this.writeAdmins(admins);
      return { ...admins[index], role: 'admin', adminId: admins[index].id };
    }

    const cabos = this.readCabos();
    const index = cabos.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Cabo não encontrado.');
    cabos[index] = { ...cabos[index], ...data, updatedAt: new Date().toISOString() };
    this.writeCabos(cabos);

    return {
      id: cabos[index].id,
      nome: cabos[index].nome,
      email: cabos[index].email,
      senha: cabos[index].senha,
      avatar: cabos[index].avatar,
      cargo: 'Cabo Eleitoral',
      role: 'cabo',
      adminId: cabos[index].adminId,
      createdAt: cabos[index].createdAt,
    };
  }

  async listAdmins(): Promise<Admin[]> {
    return this.readAdmins().map(({ senha: _senha, ...item }) => item);
  }

  async listCabos(adminId: string, params: CaboQueryParams): Promise<PaginatedCabosResult> {
    const search = (params.search || '').toLowerCase();
    const all = this.readCabos()
      .filter(item => item.adminId === adminId)
      .filter(item => !search || [item.nome, item.titulo, item.zona, item.email].join(' ').toLowerCase().includes(search))
      .map(({ senha: _senha, ...item }) => item)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const page = Math.max(1, params.page);
    const perPage = Math.max(1, params.perPage);
    const start = (page - 1) * perPage;

    return {
      items: all.slice(start, start + perPage),
      total: all.length,
      page,
      perPage,
    };
  }

  async findCaboById(id: string): Promise<CaboEleitoral | null> {
    const cabo = this.readCabos().find(item => item.id === id);
    if (!cabo) return null;
    const { senha: _senha, ...safe } = cabo;
    return safe;
  }

  async createCabo(adminId: string, data: CreateCaboInput): Promise<CaboEleitoral> {
    const cabos = this.readCabos();
    const item = {
      id: `cabo-${Date.now()}`,
      adminId,
      nome: data.nome,
      titulo: data.titulo,
      zona: data.zona,
      email: data.email,
      senha: data.senha,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    cabos.unshift(item);
    this.writeCabos(cabos);
    const { senha: _senha, ...safe } = item;
    return safe;
  }

  async updateCabo(id: string, data: UpdateCaboInput): Promise<CaboEleitoral> {
    const cabos = this.readCabos();
    const index = cabos.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Cabo não encontrado.');
    cabos[index] = { ...cabos[index], ...data, updatedAt: new Date().toISOString() };
    this.writeCabos(cabos);
    const { senha: _senha, ...safe } = cabos[index];
    return safe;
  }

  async deleteCabo(id: string): Promise<void> {
    this.writeCabos(this.readCabos().filter(item => item.id !== id));
    this.writeEleitores(this.readEleitores().filter(item => item.caboEleitoralId !== id));
  }

  async listEleitores(scope: SessionScope, caboEleitoralId?: string): Promise<Eleitor[]> {
    const all = this.readEleitores();
    if (scope.role === 'cabo' && scope.caboId) {
      return all.filter(item => item.caboEleitoralId === scope.caboId);
    }

    if (scope.role === 'admin' && scope.adminId) {
      const cabos = this.readCabos().filter(item => item.adminId === scope.adminId).map(item => item.id);
      if (caboEleitoralId) return all.filter(item => item.caboEleitoralId === caboEleitoralId && cabos.includes(item.caboEleitoralId));
      return all.filter(item => cabos.includes(item.caboEleitoralId));
    }

    return [];
  }

  async queryEleitores(scope: SessionScope, params: EleitorQueryParams): Promise<PaginatedEleitoresResult> {
    let arr = await this.listEleitores(scope, params.caboEleitoralId);

    if (params.search) {
      const search = params.search.toLowerCase();
      arr = arr.filter(item =>
        [item.nome, item.cpf, item.tituloEleitor, item.sessao, item.zona, item.localVotacao, item.promessa]
          .join(' ')
          .toLowerCase()
          .includes(search)
      );
    }

    if (params.zona) arr = arr.filter(item => item.zona === params.zona);
    if (params.promessa === 'concluida') arr = arr.filter(item => item.promessa && item.promessaConcluida);
    if (params.promessa === 'pendente') arr = arr.filter(item => item.promessa && !item.promessaConcluida);
    if (params.promessa === 'sem') arr = arr.filter(item => !item.promessa);

    const sortField = params.sortField ?? 'createdAt';
    const sortDir = params.sortDir ?? 'desc';
    arr.sort((a, b) => {
      const current = String(a[sortField] ?? '');
      const next = String(b[sortField] ?? '');
      return sortDir === 'asc' ? current.localeCompare(next) : next.localeCompare(current);
    });

    const page = Math.max(1, params.page);
    const perPage = Math.max(1, params.perPage);
    const start = (page - 1) * perPage;

    return {
      items: arr.slice(start, start + perPage),
      total: arr.length,
      page,
      perPage,
    };
  }

  async findEleitorById(scope: SessionScope, id: string): Promise<Eleitor | null> {
    const all = await this.listEleitores(scope);
    return all.find(item => item.id === id) ?? null;
  }

  async findEleitorUniqueConflicts(input: EleitorUniqueCheckInput): Promise<EleitorUniqueConflict[]> {
    const conflicts: EleitorUniqueConflict[] = [];
    const eleitores = this.readEleitores();

    if (input.cpf) {
      const eleitorByCpf = eleitores.find(item => item.id !== input.excludeId && item.cpf === input.cpf);
      if (eleitorByCpf) {
        conflicts.push({
          id: eleitorByCpf.id,
          field: 'cpf',
          value: input.cpf,
          nome: eleitorByCpf.nome,
        });
      }
    }

    if (input.tituloEleitor) {
      const eleitorByTitulo = eleitores.find(item => item.id !== input.excludeId && item.tituloEleitor === input.tituloEleitor);
      if (eleitorByTitulo) {
        conflicts.push({
          id: eleitorByTitulo.id,
          field: 'tituloEleitor',
          value: input.tituloEleitor,
          nome: eleitorByTitulo.nome,
        });
      }
    }

    return conflicts;
  }

  async createEleitor(scope: SessionScope, data: CreateEleitorInput): Promise<Eleitor> {
    const targetCaboId = scope.role === 'admin' ? data.caboEleitoralId : scope.caboId;
    if (!targetCaboId) throw new Error('Cabo eleitoral é obrigatório.');

    const item: Eleitor = {
      id: `eleitor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      caboEleitoralId: targetCaboId,
      nome: data.nome,
      cpf: data.cpf,
      tituloEleitor: data.tituloEleitor,
      sessao: data.sessao,
      zona: data.zona,
      localVotacao: data.localVotacao,
      promessa: data.promessa,
      promessaConcluida: data.promessaConcluida ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const eleitores = this.readEleitores();
    eleitores.unshift(item);
    this.writeEleitores(eleitores);
    return item;
  }

  async updateEleitor(scope: SessionScope, id: string, data: UpdateEleitorInput): Promise<Eleitor> {
    const eleitores = this.readEleitores();
    const index = eleitores.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Eleitor não encontrado.');

    const visible = await this.findEleitorById(scope, id);
    if (!visible) throw new Error('Eleitor não encontrado.');

    const targetCaboId = scope.role === 'admin' ? (data.caboEleitoralId ?? eleitores[index].caboEleitoralId) : eleitores[index].caboEleitoralId;

    eleitores[index] = {
      ...eleitores[index],
      ...data,
      caboEleitoralId: targetCaboId,
      updatedAt: new Date().toISOString(),
    };

    this.writeEleitores(eleitores);
    return eleitores[index];
  }

  async deleteEleitor(scope: SessionScope, id: string): Promise<void> {
    const visible = await this.findEleitorById(scope, id);
    if (!visible) throw new Error('Eleitor não encontrado.');
    this.writeEleitores(this.readEleitores().filter(item => item.id !== id));
  }

  // ── Token de recuperação de senha (no-op neste adapter) ──
  // O fluxo de reset de senha exige banco de dados real para persistência do token.

  async createPasswordResetToken(): Promise<void> {
    console.warn('[LocalAdapter] createPasswordResetToken: sem efeito no adapter em memória.');
  }

  async findPasswordResetToken(): Promise<PasswordResetTokenRecord | null> {
    return null;
  }

  async markPasswordResetTokenUsed(): Promise<void> {}

  async deleteExpiredPasswordResetTokens(): Promise<void> {}
}

function isRecoverableDatabaseError(error: unknown): boolean {
  if (error instanceof AppError && error.code === 'DATABASE_ERROR') {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("can't reach database server") ||
    message.includes('can\'t reach database server') ||
    message.includes('p1001') ||
    message.includes('econnrefused') ||
    message.includes('connection refused') ||
    message.includes('timeout')
  );
}

class ResilientDatabaseAdapter implements DatabaseAdapter {
  constructor(
    private readonly primary: DatabaseAdapter,
    private readonly fallback: DatabaseAdapter
  ) {}

  private async executeWithFallback<T>(action: string, primaryCall: () => Promise<T>, fallbackCall: () => Promise<T>): Promise<T> {
    try {
      return await primaryCall();
    } catch (error) {
      if (!isRecoverableDatabaseError(error)) {
        throw error;
      }

      console.warn(`[database] Falha no Postgres durante ${action}. Usando fallback em memória.`);
      return fallbackCall();
    }
  }

  findAuthUserByCredentials(email: string, senha: string): Promise<AuthUserWithPassword | null> {
    return this.executeWithFallback(
      'findAuthUserByCredentials',
      () => this.primary.findAuthUserByCredentials(email, senha),
      () => this.fallback.findAuthUserByCredentials(email, senha)
    );
  }

  findAuthUserByEmail(email: string): Promise<AuthUserWithPassword | null> {
    return this.executeWithFallback(
      'findAuthUserByEmail',
      () => this.primary.findAuthUserByEmail(email),
      () => this.fallback.findAuthUserByEmail(email)
    );
  }

  findAuthUserById(role: 'admin' | 'cabo', id: string): Promise<AuthUserWithPassword | null> {
    return this.executeWithFallback(
      'findAuthUserById',
      () => this.primary.findAuthUserById(role, id),
      () => this.fallback.findAuthUserById(role, id)
    );
  }

  updateAuthUser(role: 'admin' | 'cabo', id: string, data: Partial<AuthUserWithPassword>): Promise<AuthUserWithPassword> {
    return this.executeWithFallback(
      'updateAuthUser',
      () => this.primary.updateAuthUser(role, id, data),
      () => this.fallback.updateAuthUser(role, id, data)
    );
  }

  listAdmins(): Promise<Admin[]> {
    return this.executeWithFallback('listAdmins', () => this.primary.listAdmins(), () => this.fallback.listAdmins());
  }

  listCabos(adminId: string, params: CaboQueryParams): Promise<PaginatedCabosResult> {
    return this.executeWithFallback(
      'listCabos',
      () => this.primary.listCabos(adminId, params),
      () => this.fallback.listCabos(adminId, params)
    );
  }

  findCaboById(id: string): Promise<CaboEleitoral | null> {
    return this.executeWithFallback('findCaboById', () => this.primary.findCaboById(id), () => this.fallback.findCaboById(id));
  }

  createCabo(adminId: string, data: CreateCaboInput): Promise<CaboEleitoral> {
    return this.executeWithFallback(
      'createCabo',
      () => this.primary.createCabo(adminId, data),
      () => this.fallback.createCabo(adminId, data)
    );
  }

  updateCabo(id: string, data: UpdateCaboInput): Promise<CaboEleitoral> {
    return this.executeWithFallback(
      'updateCabo',
      () => this.primary.updateCabo(id, data),
      () => this.fallback.updateCabo(id, data)
    );
  }

  deleteCabo(id: string): Promise<void> {
    return this.executeWithFallback('deleteCabo', () => this.primary.deleteCabo(id), () => this.fallback.deleteCabo(id));
  }

  listEleitores(scope: SessionScope, caboEleitoralId?: string): Promise<Eleitor[]> {
    return this.executeWithFallback(
      'listEleitores',
      () => this.primary.listEleitores(scope, caboEleitoralId),
      () => this.fallback.listEleitores(scope, caboEleitoralId)
    );
  }

  queryEleitores(scope: SessionScope, params: EleitorQueryParams): Promise<PaginatedEleitoresResult> {
    return this.executeWithFallback(
      'queryEleitores',
      () => this.primary.queryEleitores(scope, params),
      () => this.fallback.queryEleitores(scope, params)
    );
  }

  findEleitorById(scope: SessionScope, id: string): Promise<Eleitor | null> {
    return this.executeWithFallback(
      'findEleitorById',
      () => this.primary.findEleitorById(scope, id),
      () => this.fallback.findEleitorById(scope, id)
    );
  }

  findEleitorUniqueConflicts(input: EleitorUniqueCheckInput): Promise<EleitorUniqueConflict[]> {
    return this.executeWithFallback(
      'findEleitorUniqueConflicts',
      () => this.primary.findEleitorUniqueConflicts(input),
      () => this.fallback.findEleitorUniqueConflicts(input)
    );
  }

  createEleitor(scope: SessionScope, data: CreateEleitorInput): Promise<Eleitor> {
    return this.executeWithFallback(
      'createEleitor',
      () => this.primary.createEleitor(scope, data),
      () => this.fallback.createEleitor(scope, data)
    );
  }

  updateEleitor(scope: SessionScope, id: string, data: UpdateEleitorInput): Promise<Eleitor> {
    return this.executeWithFallback(
      'updateEleitor',
      () => this.primary.updateEleitor(scope, id, data),
      () => this.fallback.updateEleitor(scope, id, data)
    );
  }

  deleteEleitor(scope: SessionScope, id: string): Promise<void> {
    return this.executeWithFallback(
      'deleteEleitor',
      () => this.primary.deleteEleitor(scope, id),
      () => this.fallback.deleteEleitor(scope, id)
    );
  }

  createPasswordResetToken(email: string, role: string, token: string, expiresAt: Date): Promise<void> {
    return this.executeWithFallback(
      'createPasswordResetToken',
      () => this.primary.createPasswordResetToken(email, role, token, expiresAt),
      () => this.fallback.createPasswordResetToken(email, role, token, expiresAt)
    );
  }

  findPasswordResetToken(token: string): Promise<PasswordResetTokenRecord | null> {
    return this.executeWithFallback(
      'findPasswordResetToken',
      () => this.primary.findPasswordResetToken(token),
      () => this.fallback.findPasswordResetToken(token)
    );
  }

  markPasswordResetTokenUsed(token: string): Promise<void> {
    return this.executeWithFallback(
      'markPasswordResetTokenUsed',
      () => this.primary.markPasswordResetTokenUsed(token),
      () => this.fallback.markPasswordResetTokenUsed(token)
    );
  }

  deleteExpiredPasswordResetTokens(): Promise<void> {
    return this.executeWithFallback(
      'deleteExpiredPasswordResetTokens',
      () => this.primary.deleteExpiredPasswordResetTokens(),
      () => this.fallback.deleteExpiredPasswordResetTokens()
    );
  }
}

type AdapterRuntime = 'server' | 'client';
type AdapterOptions = { runtime?: AdapterRuntime };

export function createDatabaseAdapter(options: AdapterOptions = {}): DatabaseAdapter {
  const runtime = options.runtime ?? (typeof window === 'undefined' ? 'server' : 'client');

  if (runtime === 'server') {
    const wantsPostgres = process.env.DATABASE_PROVIDER === 'postgres';
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
    const allowFallback = process.env.DATABASE_FALLBACK_TO_MEMORY === 'true';

    if (wantsPostgres && hasDatabaseUrl && allowFallback) {
      return new ResilientDatabaseAdapter(new PostgresDatabaseAdapter(), new LocalStorageDatabaseAdapter());
    }

    if (wantsPostgres && hasDatabaseUrl) return new PostgresDatabaseAdapter();
    if (!allowFallback && wantsPostgres) {
      throw new Error('DATABASE_URL não configurada e fallback em memória desabilitado.');
    }

    return new LocalStorageDatabaseAdapter();
  }

  return new LocalStorageDatabaseAdapter();
}
