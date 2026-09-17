// Contratos de tipos compartilhados entre frontend, serviços e adapters.

export type AuthRole = 'admin' | 'cabo';

export interface Admin {
  id: string;
  nome: string;
  email: string;
  avatar?: string;
  cargo?: string;
  createdAt: string;
}

export interface Lider {
  id: string;
  nome: string;
  adminId?: string;
  email?: string;
  telefone?: string;
  cargo?: string;
  avatar?: string;
  cor?: string;
  createdAt?: string;
  updatedAt?: string;
  admin?: Pick<Admin, 'id' | 'nome' | 'email'>;
  cabos?: Array<Pick<CaboEleitoral, 'id' | 'nome' | 'titulo' | 'zona'>>;
  totalEleitores?: number;
  totalCabos?: number;
}

export interface CaboEleitoral {
  id: string;
  adminId: string;
  liderId?: string;
  nome: string;
  titulo: string;
  zona: string;
  email: string;
  telefone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  admin?: Pick<Admin, 'id' | 'nome' | 'email'>;
  lider?: Pick<Lider, 'id' | 'nome' | 'cor'>;
  liderNome?: string;
  liderCor?: string;
}

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  avatar?: string;
  cargo?: string;
  role: AuthRole;
  adminId?: string;
  createdAt: string;
}

export interface Eleitor {
  id: string;
  caboEleitoralId: string;
  nome?: string;
  cpf?: string;
  tituloEleitor?: string;
  telefone?: string;
  sessao?: string;
  zona?: string;
  localVotacao?: string;
  promessa?: string;
  promessaConcluida?: boolean;
  createdAt: string;
  updatedAt: string;
  caboEleitoral?: Pick<CaboEleitoral, 'id' | 'nome' | 'titulo' | 'zona' | 'adminId' | 'liderNome' | 'liderCor'>;
  // inclui cor do líder quando disponível
  // (algumas consultas retornam `liderCor` junto ao `caboEleitoral`)
  liderNome?: string;


































































































































































































































































































































































































































































































































































































































































































































































































































































































  liderCor?: string;
}

export interface FamiliaMembro {
  id: string;
  familiaId: string;
  eleitorId: string;
  grauParentesco: string;
  createdAt: string;
  updatedAt: string;
  eleitor?: Pick<Eleitor, 'id' | 'nome' | 'cpf' | 'tituloEleitor' | 'zona'>;
}

export interface Familia {
  id: string;
  caboEleitoralId: string;
  nome?: string;
  createdAt: string;
  updatedAt: string;
  caboEleitoral?: Pick<CaboEleitoral, 'id' | 'nome' | 'zona'>;
  membros?: FamiliaMembro[];
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

export interface CabosDashboardStats {
  totalCabos: number;
  totalEleitores: number;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  expiresAt?: number | null;
  hasHydrated: boolean;
  initialize: () => Promise<void>;
  setHasHydrated: (value: boolean) => void;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
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
