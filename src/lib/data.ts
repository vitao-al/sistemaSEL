// Camada de acesso a dados no client.

import { Admin, AuthUser, CaboEleitoral, DashboardStats, Eleitor } from '@/types';
import { httpRequest } from './http/client';
import {
  CaboPayload,
  EleitorUniqueConflict,
  EleitorPayload,
  EleitorPromessaFilter,
  EleitorSortDir,
  EleitorSortField,
  PaginatedCabosResult,
  PaginatedEleitoresResult,
} from './database/types';

export type EleitorListQuery = {
  search?: string;
  zona?: string;
  promessa?: EleitorPromessaFilter;
  sortField?: EleitorSortField;
  sortDir?: EleitorSortDir;
  caboEleitoralId?: string;
  page: number;
  perPage: number;
};

export type CaboListQuery = {
  search?: string;
  page: number;
  perPage: number;
};

export async function authLogin(email: string, senha: string): Promise<{ user: AuthUser }> {
  return httpRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
}

export async function authGetSession(): Promise<{ user: AuthUser }> {
  return httpRequest('/api/auth/session');
}

export async function authLogout(): Promise<void> {
  await httpRequest('/api/auth/logout', {
    method: 'POST',
  });
}

export async function authAcceptCompliance(preferences: boolean): Promise<void> {
  await httpRequest('/api/auth/consent', {
    method: 'POST',
    body: JSON.stringify({ preferences }),
  });
}

export async function authForgotPassword(email: string): Promise<void> {
  await httpRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function authValidateResetToken(token: string): Promise<{
  valid: boolean;
  expiresAt: string;
  secondsLeft: number;
  email: string;
}> {
  return httpRequest(`/api/auth/reset-password/${token}`);
}

export async function authResetPassword(token: string, novaSenha: string): Promise<{ message: string }> {
  return httpRequest(`/api/auth/reset-password/${token}`, {
    method: 'POST',
    body: JSON.stringify({ novaSenha }),
  });
}

export async function getAdmins(): Promise<Admin[]> {
  return httpRequest('/api/auth/admins');
}

export async function registerCabo(data: { nome: string; email: string; senha: string; titulo: string; zona: string; adminId: string }): Promise<CaboEleitoral> {
  return httpRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCabos(query: CaboListQuery): Promise<PaginatedCabosResult> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  params.set('page', String(query.page));
  params.set('perPage', String(query.perPage));
  return httpRequest(`/api/cabos?${params.toString()}`);
}

export async function createCabo(data: CaboPayload): Promise<CaboEleitoral> {
  return httpRequest('/api/cabos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCabo(id: string, data: Partial<CaboPayload>): Promise<CaboEleitoral> {
  return httpRequest(`/api/cabos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCabo(id: string): Promise<void> {
  await httpRequest(`/api/cabos/${id}`, {
    method: 'DELETE',
  });
}

export async function getCabosReport(): Promise<{
  generatedAt: string;
  admins: Array<{
    admin: Admin;
    cabos: Array<{ cabo: CaboEleitoral; eleitores: Eleitor[] }>;
    metrics: {
      totalCabos: number;
      totalEleitores: number;
      totalPromessas: number;
      totalPromessasConcluidas: number;
      totalPromessasPendentes: number;
    };
  }>;
  metrics: {
    totalAdmins: number;
    totalCabos: number;
    totalEleitores: number;
    totalPromessas: number;
    totalPromessasConcluidas: number;
    totalPromessasPendentes: number;
  };
}> {
  return httpRequest('/api/cabos/report');
}

export async function getEleitores(query: EleitorListQuery): Promise<PaginatedEleitoresResult> {
  const params = new URLSearchParams();

  if (query.search) params.set('search', query.search);
  if (query.zona) params.set('zona', query.zona);
  if (query.promessa) params.set('promessa', query.promessa);
  if (query.sortField) params.set('sortField', query.sortField);
  if (query.sortDir) params.set('sortDir', query.sortDir);
  if (query.caboEleitoralId) params.set('caboEleitoralId', query.caboEleitoralId);
  params.set('page', String(query.page));
  params.set('perPage', String(query.perPage));

  return httpRequest(`/api/eleitores?${params.toString()}`);
}

export async function getEleitorById(id: string): Promise<Eleitor | null> {
  return httpRequest(`/api/eleitores/${id}`);
}

export async function validateEleitorUnique(query: {
  cpf?: string;
  tituloEleitor?: string;
  excludeId?: string;
}): Promise<{
  cpfAvailable: boolean;
  tituloEleitorAvailable: boolean;
  conflicts: EleitorUniqueConflict[];
}> {
  const params = new URLSearchParams();

  if (query.cpf) params.set('cpf', query.cpf);
  if (query.tituloEleitor) params.set('tituloEleitor', query.tituloEleitor);
  if (query.excludeId) params.set('excludeId', query.excludeId);

  return httpRequest(`/api/eleitores/validate?${params.toString()}`);
}

export async function createEleitor(data: EleitorPayload): Promise<Eleitor> {
  return httpRequest('/api/eleitores', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEleitor(id: string, data: Partial<EleitorPayload>): Promise<Eleitor> {
  return httpRequest(`/api/eleitores/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteEleitor(id: string): Promise<void> {
  await httpRequest(`/api/eleitores/${id}`, {
    method: 'DELETE',
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return httpRequest('/api/dashboard/stats');
}

export async function updateUserProfile(id: string, role: 'admin' | 'cabo', data: Partial<AuthUser>): Promise<AuthUser> {
  return httpRequest(`/api/users/${id}?role=${role}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateUserSenha(id: string, role: 'admin' | 'cabo', senhaAtual: string, novaSenha: string): Promise<void> {
  await httpRequest(`/api/users/${id}/senha?role=${role}`, {
    method: 'PATCH',
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
}
