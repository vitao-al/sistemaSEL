import { Eleitor, User } from '@/types';

// Usuário com senha disponível apenas na camada de persistência/serviço.
export type UserWithPassword = User & { senha: string };

// =========================
// Payloads de Eleitor
// =========================

// Estrutura base dos dados recebidos para criar/atualizar eleitor.
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

// Payload de criação: usa a estrutura base completa.
export type CreateEleitorInput = EleitorPayload;

// Payload de atualização: parcial para permitir edição campo a campo.
export type UpdateEleitorInput = Partial<EleitorPayload>;

// =========================
// Tipos de consulta/listagem
// =========================

// Campos permitidos para ordenação de eleitores.
export type EleitorSortField = 'nome' | 'zona' | 'createdAt';

// Direção da ordenação.
export type EleitorSortDir = 'asc' | 'desc';

// Filtro de promessa utilizado nas buscas.
export type EleitorPromessaFilter = '' | 'concluida' | 'pendente' | 'sem';

// Parâmetros de consulta paginada de eleitores.
export interface EleitorQueryParams {
  search?: string;
  zona?: string;
  promessa?: EleitorPromessaFilter;
  sortField?: EleitorSortField;
  sortDir?: EleitorSortDir;
  page: number;
  perPage: number;
}

// Resultado paginado retornado para a lista de eleitores.
export interface PaginatedEleitoresResult {
  items: Eleitor[];
  total: number;
  page: number;
  perPage: number;
}

// =========================
// Contrato do adapter de banco
// =========================

// Interface única que abstrai as operações de dados, independente do storage (Postgres ou local).
export interface DatabaseAdapter {
  // Operações de usuário/autenticação.
  findUserByCredentials(email: string, senha: string): Promise<UserWithPassword | null>;
  findUserByEmail(email: string): Promise<UserWithPassword | null>;
  findUserById(id: string): Promise<UserWithPassword | null>;
  updateUser(id: string, data: Partial<UserWithPassword>): Promise<UserWithPassword>;

  // Operações de eleitor (sempre escopadas por userId).
  listEleitores(userId: string): Promise<Eleitor[]>;
  queryEleitores(userId: string, params: EleitorQueryParams): Promise<PaginatedEleitoresResult>;
  findEleitorById(userId: string, id: string): Promise<Eleitor | null>;
  createEleitor(userId: string, data: CreateEleitorInput): Promise<Eleitor>;
  updateEleitor(userId: string, id: string, data: UpdateEleitorInput): Promise<Eleitor>;
  deleteEleitor(userId: string, id: string): Promise<void>;
}
