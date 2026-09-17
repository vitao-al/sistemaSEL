/**
 * Stubs de `DatabaseAdapter` para testes de serviços — evita duplicar dezenas de métodos em cada arquivo.
 */

import type { DatabaseAdapter, AuthUserWithPassword } from '@/lib/database/types';

const emptyCabosPage = { items: [] as never[], total: 0, page: 1, perPage: 20 };
const emptyLideresPage = { items: [] as never[], total: 0, page: 1, perPage: 20 };

async function notImplemented(): Promise<never> {
  throw new Error('not implemented in mock');
}

export function createMockDatabaseAdapter(overrides: Partial<DatabaseAdapter> = {}): DatabaseAdapter {
  const base: DatabaseAdapter = {
    findAuthUserByCredentials: async () => null,
    findAuthUserByEmail: async () => null,
    findAuthUserById: async () => null,
    updateAuthUser: notImplemented,
    listAdmins: async () => [],
    listLideres: async () => emptyLideresPage,
    findLiderById: async () => null,
    createLider: notImplemented,
    updateLider: notImplemented,
    deleteLider: notImplemented,
    listCabos: async () => emptyCabosPage,
    findCaboById: async () => null,
    createCabo: notImplemented,
    updateCabo: notImplemented,
    deleteCabo: notImplemented,
    listEleitores: async () => [],
    queryEleitores: async (_scope, params) => ({
      items: [],
      total: 0,
      page: params.page,
      perPage: params.perPage,
    }),
    findEleitorById: async () => null,
    findEleitorUniqueConflicts: async () => [],
    createEleitor: notImplemented,
    updateEleitor: notImplemented,
    deleteEleitor: notImplemented,
    createPasswordResetToken: async () => {},
    findPasswordResetToken: async () => null,
    markPasswordResetTokenUsed: async () => {},
    deleteExpiredPasswordResetTokens: async () => {},
  };

  return { ...base, ...overrides };
}

export function mockAuthUser(overrides: Partial<AuthUserWithPassword> & Pick<AuthUserWithPassword, 'id' | 'email' | 'senha'>): AuthUserWithPassword {
  return {
    nome: 'Teste',
    role: 'admin',
    adminId: overrides.id,
    createdAt: new Date().toISOString(),
    cargo: 'Admin',
    ...overrides,
  };
}
