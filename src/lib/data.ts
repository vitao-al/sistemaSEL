import { DashboardStats, Eleitor, User } from '@/types';
import { httpRequest } from './http/client';
import {
  EleitorPayload,
  EleitorPromessaFilter,
  EleitorSortDir,
  EleitorSortField,
  PaginatedEleitoresResult,
} from './database/types';

export type EleitorListQuery = {
  search?: string;
  zona?: string;
  promessa?: EleitorPromessaFilter;
  sortField?: EleitorSortField;
  sortDir?: EleitorSortDir;
  page: number;
  perPage: number;
};

export async function authLogin(email: string, senha: string): Promise<{ user: User; token: string }> {
  return httpRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
}

export async function authForgotPassword(email: string): Promise<void> {
  await httpRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function getEleitores(query: EleitorListQuery): Promise<PaginatedEleitoresResult> {
  const params = new URLSearchParams();

  if (query.search) params.set('search', query.search);
  if (query.zona) params.set('zona', query.zona);
  if (query.promessa) params.set('promessa', query.promessa);
  if (query.sortField) params.set('sortField', query.sortField);
  if (query.sortDir) params.set('sortDir', query.sortDir);
  params.set('page', String(query.page));
  params.set('perPage', String(query.perPage));

  return httpRequest(`/api/eleitores?${params.toString()}`);
}

export async function getEleitorById(id: string): Promise<Eleitor | null> {
  return httpRequest(`/api/eleitores/${id}`);
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

export async function updateUserProfile(id: string, data: Partial<User>): Promise<User> {
  return httpRequest(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateUserSenha(id: string, senhaAtual: string, novaSenha: string): Promise<void> {
  await httpRequest(`/api/users/${id}/senha`, {
    method: 'PATCH',
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
}
