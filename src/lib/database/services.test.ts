// Testes de serviços de domínio usando adapter mockado em memória.
// Verifica fluxos críticos de autenticação e atualização de usuário.

import { describe, expect, it } from 'vitest';
import { verifyAuthToken } from '@/lib/auth/jwt';
import { AuthService, UserService } from './services';
import { createMockDatabaseAdapter, mockAuthUser } from '@/test/support/mock-database-adapter';

describe('AuthService', () => {
  it('retorna usuário e token quando credenciais são válidas', async () => {
    const user = mockAuthUser({
      id: '1',
      email: 'teste@mail.com',
      senha: '123456',
      role: 'admin',
      adminId: '1',
    });

    const adapter = createMockDatabaseAdapter({
      findAuthUserByCredentials: async (email, senha) =>
        email === 'teste@mail.com' && senha === '123456' ? user : null,
    });

    const service = new AuthService(adapter);
    const result = await service.login('teste@mail.com', '123456');

    expect(result.user.email).toBe('teste@mail.com');
    const session = verifyAuthToken(result.token);
    expect(session).toMatchObject({ userId: '1', role: 'admin' });
  });

  it('lança erro quando credenciais são inválidas', async () => {
    const service = new AuthService(createMockDatabaseAdapter());
    await expect(service.login('invalido@mail.com', '123')).rejects.toThrow('Email ou senha inválidos.');
  });

  it('rejeita login de cabo mesmo quando o usuário existir no adaptador', async () => {
    const cabo = mockAuthUser({
      id: 'cabo-1',
      email: 'cabo@teste.com',
      senha: '123456',
      role: 'cabo',
      adminId: 'admin-1',
    });

    const adapter = createMockDatabaseAdapter({
      findAuthUserByCredentials: async (_email, _senha) => cabo,
    });

    const service = new AuthService(adapter);
    await expect(service.login('cabo@teste.com', '123456')).rejects.toThrow('Email ou senha inválidos.');
  });
});

describe('UserService', () => {
  it('lança erro quando senha atual não confere', async () => {
    const user = mockAuthUser({
      id: '1',
      email: 'teste@mail.com',
      senha: '123456',
      role: 'admin',
      adminId: '1',
    });

    const adapter = createMockDatabaseAdapter({
      findAuthUserById: async () => user,
    });

    const service = new UserService(adapter);
    await expect(service.updateUserSenha('admin', '1', '000000', '654321')).rejects.toThrow('Senha atual incorreta.');
  });

  it('atualiza senha com hash seguro quando a senha atual confere', async () => {
    let updatedSenha = '';
    const user = mockAuthUser({
      id: '1',
      email: 'teste@mail.com',
      senha: '123456',
      role: 'admin',
      adminId: '1',
    });

    const adapter = createMockDatabaseAdapter({
      findAuthUserById: async () => user,
      updateAuthUser: async (_role, _id, data) => {
        updatedSenha = data.senha;
      },
    });

    const service = new UserService(adapter);
    await service.updateUserSenha('admin', '1', '123456', 'novasenha123');

    expect(updatedSenha).not.toBe('novasenha123');
    expect(updatedSenha).toMatch(/^\$2[abxy]\$\d{2}\$/);
  });
});
