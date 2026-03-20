import { Admin, AuthRole, AuthUser, CaboEleitoral, Eleitor } from '@/types';

export type AdminWithPassword = Admin & { senha: string };
export type CaboWithPassword = CaboEleitoral & { senha: string };
export type AuthUserWithPassword = (AuthUser & { senha: string }) & { role: AuthRole };

export interface SessionScope {
  role: AuthRole;
  userId: string;
  adminId?: string;
  caboId?: string;
}

export interface EleitorUniqueCheckInput {
  cpf?: string;
  tituloEleitor?: string;
  excludeId?: string;
}

export interface EleitorUniqueConflict {
  id: string;
  field: 'cpf' | 'tituloEleitor';
  value: string;
  nome?: string;
}

export interface EleitorPayload {
  nome?: string;
  cpf?: string;
  tituloEleitor?: string;
  sessao?: string;
  zona?: string;
  localVotacao?: string;
  promessa?: string;
  promessaConcluida?: boolean;
  caboEleitoralId?: string;
}

export type CreateEleitorInput = EleitorPayload;
export type UpdateEleitorInput = Partial<EleitorPayload>;

export interface CaboPayload {
  nome: string;
  titulo: string;
  zona: string;
  email: string;
  senha: string;
}

export type CreateCaboInput = CaboPayload;
export type UpdateCaboInput = Partial<CaboPayload>;

export type EleitorSortField = 'nome' | 'zona' | 'createdAt';
export type EleitorSortDir = 'asc' | 'desc';
export type EleitorPromessaFilter = '' | 'concluida' | 'pendente' | 'sem';

export interface EleitorQueryParams {
  search?: string;
  zona?: string;
  promessa?: EleitorPromessaFilter;
  sortField?: EleitorSortField;
  sortDir?: EleitorSortDir;
  page: number;
  perPage: number;
  caboEleitoralId?: string;
}

export interface CaboQueryParams {
  search?: string;
  page: number;
  perPage: number;
}

export interface PaginatedEleitoresResult {
  items: Eleitor[];
  total: number;
  page: number;
  perPage: number;
}

export interface PaginatedCabosResult {
  items: CaboEleitoral[];
  total: number;
  page: number;
  perPage: number;
}

export interface DatabaseAdapter {
  findAuthUserByCredentials(email: string, senha: string): Promise<AuthUserWithPassword | null>;
  findAuthUserByEmail(email: string): Promise<AuthUserWithPassword | null>;
  findAuthUserById(role: AuthRole, id: string): Promise<AuthUserWithPassword | null>;
  updateAuthUser(role: AuthRole, id: string, data: Partial<AuthUserWithPassword>): Promise<AuthUserWithPassword>;

  listAdmins(): Promise<Admin[]>;

  listCabos(adminId: string, params: CaboQueryParams): Promise<PaginatedCabosResult>;
  findCaboById(id: string): Promise<CaboEleitoral | null>;
  createCabo(adminId: string, data: CreateCaboInput): Promise<CaboEleitoral>;
  updateCabo(id: string, data: UpdateCaboInput): Promise<CaboEleitoral>;
  deleteCabo(id: string): Promise<void>;

  listEleitores(scope: SessionScope, caboEleitoralId?: string): Promise<Eleitor[]>;
  queryEleitores(scope: SessionScope, params: EleitorQueryParams): Promise<PaginatedEleitoresResult>;
  findEleitorById(scope: SessionScope, id: string): Promise<Eleitor | null>;
  findEleitorUniqueConflicts(input: EleitorUniqueCheckInput): Promise<EleitorUniqueConflict[]>;
  createEleitor(scope: SessionScope, data: CreateEleitorInput): Promise<Eleitor>;
  updateEleitor(scope: SessionScope, id: string, data: UpdateEleitorInput): Promise<Eleitor>;
  deleteEleitor(scope: SessionScope, id: string): Promise<void>;

  // Tokens de recuperação de senha
  createPasswordResetToken(email: string, role: string, token: string, expiresAt: Date): Promise<void>;
  findPasswordResetToken(token: string): Promise<PasswordResetTokenRecord | null>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
}

// Registro de token de recuperação retornado pelo adapter.
export interface PasswordResetTokenRecord {
  id: string;
  token: string;
  email: string;
  role: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
