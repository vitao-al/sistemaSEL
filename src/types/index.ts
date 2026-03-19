// Contratos de tipos compartilhados entre frontend, serviços e adapters.
// Mantém alinhamento de shape de dados em toda a aplicação.

export interface User {
  id: string;
  nome: string;
  email: string;
  avatar?: string;
  cargo?: string;
  createdAt: string;
}

export interface Eleitor {
  id: string;
  userId: string;
  nome?: string;
  cpf?: string;
  tituloEleitor?: string;
  sessao?: string;
  zona?: string;
  localVotacao?: string;
  promessa?: string;
  promessaConcluida?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalEleitores: number;
  totalEleitoresVariacao: number;
  promessasConcluidas: number;
  promessasConcluidasVariacao: number;
  promessasPendentes: number;
  ultimoEleitorAdicionado?: Eleitor;
  eleitoresPorMes: { mes: string; total: number }[];
  promessasPorStatus: { status: string; total: number }[];
  zonasMaisAtivas: { zona: string; total: number }[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  expiresAt?: number | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export interface EleitorFilters {
  search: string;
  zona?: string;
  localVotacao?: string;
  promessaConcluida?: boolean | null;
  orderBy: 'nome' | 'createdAt' | 'updatedAt';
  orderDir: 'asc' | 'desc';
  page: number;
  perPage: number;
}
