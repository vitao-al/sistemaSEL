// Testes de serviços de domínio usando adapter mockado em memória.
// Verifica fluxos críticos de autenticação e atualização de usuário.

import { describe, expect, it } from 'vitest';
import { AuthService, UserService } from './services';
import { DatabaseAdapter, UserWithPassword } from './types';

function createMockAdapter(user?: UserWithPassword): DatabaseAdapter {
  const users = user ? [user] : [];

  return {
    async findUserByCredentials(email, senha) {
      return users.find(current => current.email === email && current.senha === senha) ?? null;
    },
    async findUserByEmail(email) {
      return users.find(current => current.email === email) ?? null;
    },
    async findUserById(id) {
      return users.find(current => current.id === id) ?? null;
    },
    async updateUser(id, data) {
      const index = users.findIndex(current => current.id === id);
      if (index === -1) {
        throw new Error('not found');
      }
      users[index] = { ...users[index], ...data };
      return users[index];
    },
    async listEleitores() {
      return [];
    },
    async queryEleitores(_userId, params) {
      return {
        items: [],
        total: 0,
        page: params.page,
        perPage: params.perPage,
      };
    },
    async findEleitorById() {
      return null;
    },
    async createEleitor() {
      throw new Error('not implemented');
    },
    async updateEleitor() {
      throw new Error('not implemented');
    },
    async deleteEleitor() {
      return;
    },
  };
}

describe('AuthService', () => {
  it('retorna usuário e token quando credenciais são válidas', async () => {
    const adapter = createMockAdapter({
      id: '1',
      nome: 'Teste',
      email: 'teste@mail.com',
      senha: '123456',
      createdAt: new Date().toISOString(),
    });

    const service = new AuthService(adapter);
    const result = await service.login('teste@mail.com', '123456');

    expect(result.user.email).toBe('teste@mail.com');
    expect(result.token).toContain('mock-token-1');
  });

  it('lança erro quando credenciais são inválidas', async () => {
    const service = new AuthService(createMockAdapter());
    await expect(service.login('invalido@mail.com', '123')).rejects.toThrow('Email ou senha inválidos.');
  });
});

describe('UserService', () => {
  it('lança erro quando senha atual não confere', async () => {
    const adapter = createMockAdapter({
      id: '1',
      nome: 'Teste',
      email: 'teste@mail.com',
      senha: '123456',
      createdAt: new Date().toISOString(),
    });

    const service = new UserService(adapter);
    await expect(service.updateUserSenha('1', '000000', '654321')).rejects.toThrow('Senha atual incorreta.');
  });
});
