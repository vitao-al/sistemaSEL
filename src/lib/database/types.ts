import { Eleitor, User } from '@/types';

export type UserWithPassword = User & { senha: string };

export type CreateEleitorInput = Omit<Eleitor, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateEleitorInput = Partial<Omit<Eleitor, 'id' | 'createdAt'>>;
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

  listEleitores(): Promise<Eleitor[]>;
  queryEleitores(params: EleitorQueryParams): Promise<PaginatedEleitoresResult>;
  findEleitorById(id: string): Promise<Eleitor | null>;
  createEleitor(data: CreateEleitorInput): Promise<Eleitor>;
  updateEleitor(id: string, data: UpdateEleitorInput): Promise<Eleitor>;
  deleteEleitor(id: string): Promise<void>;
}
