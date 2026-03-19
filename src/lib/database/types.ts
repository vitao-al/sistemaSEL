import { Eleitor, User } from '@/types';

export type UserWithPassword = User & { senha: string };

export interface EleitorPayload {
  nome?: string;
  cpf?: string;
  tituloEleitor?: string;
  sessao?: string;
  zona?: string;
  localVotacao?: string;
  promessa?: string;
  promessaConcluida?: boolean;
}

export type CreateEleitorInput = EleitorPayload;
export type UpdateEleitorInput = Partial<EleitorPayload>;
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
}

export interface PaginatedEleitoresResult {
  items: Eleitor[];
  total: number;
  page: number;
  perPage: number;
}

export interface DatabaseAdapter {
  findUserByCredentials(email: string, senha: string): Promise<UserWithPassword | null>;
  findUserByEmail(email: string): Promise<UserWithPassword | null>;
  findUserById(id: string): Promise<UserWithPassword | null>;
  updateUser(id: string, data: Partial<UserWithPassword>): Promise<UserWithPassword>;

  listEleitores(userId: string): Promise<Eleitor[]>;
  queryEleitores(userId: string, params: EleitorQueryParams): Promise<PaginatedEleitoresResult>;
  findEleitorById(userId: string, id: string): Promise<Eleitor | null>;
  createEleitor(userId: string, data: CreateEleitorInput): Promise<Eleitor>;
  updateEleitor(userId: string, id: string, data: UpdateEleitorInput): Promise<Eleitor>;
  deleteEleitor(userId: string, id: string): Promise<void>;
}
