// Testes unitários para garantir o comportamento do pipeline de erros padronizados.
// Valida conversões e assertions de domínio.

import { describe, expect, it } from 'vitest';
import { AppError, assertOrThrow, toAppError } from './errors';
import { LocalStorageDatabaseAdapter, shouldEnableDatabaseFallback } from './database/adapter';

describe('errors', () => {
  it('mantém AppError sem alteração', () => {
    const appError = new AppError('VALIDATION_ERROR', 400, 'inválido');
    const converted = toAppError(appError);
    expect(converted).toBe(appError);
  });

  it('converte Error nativo para AppError interno', () => {
    const converted = toAppError(new Error('falha'));
    expect(converted.code).toBe('INTERNAL_ERROR');
    expect(converted.status).toBe(500);
    expect(converted.message).toBe('falha');
  });

  it('lança quando assertOrThrow recebe condição falsa', () => {
    expect(() => assertOrThrow(false, 'campo obrigatório')).toThrow('campo obrigatório');
  });
});

describe('database fallback config', () => {
  it('habilita fallback por padrão em desenvolvimento quando a flag não foi definida', () => {
    expect(shouldEnableDatabaseFallback({ NODE_ENV: 'development' })).toBe(true);
  });

  it('desativa fallback em produção quando a flag não foi definida', () => {
    expect(shouldEnableDatabaseFallback({ NODE_ENV: 'production' })).toBe(false);
  });

  it('respeita override explícito da flag', () => {
    expect(shouldEnableDatabaseFallback({ NODE_ENV: 'production', DATABASE_FALLBACK_TO_MEMORY: 'true' })).toBe(true);
    expect(shouldEnableDatabaseFallback({ NODE_ENV: 'development', DATABASE_FALLBACK_TO_MEMORY: 'false' })).toBe(false);
  });
});

describe('local storage adapter', () => {
  it('lista todos os cabos quando nenhum líder está filtrado', async () => {
    const adapter = new LocalStorageDatabaseAdapter();
    const adminId = 'admin-1';

    const leader = await adapter.createLider(adminId, { nome: 'Líder Teste', email: 'lider.teste@sistema.com', cor: '#ff0000' });
    await adapter.createCabo(adminId, { nome: 'Cabo A', titulo: '111', zona: '01', email: 'caboa@sistema.com', telefone: '(11) 99999-0000' });
    await adapter.createCabo(adminId, { nome: 'Cabo B', titulo: '222', zona: '02', email: 'cabob@sistema.com', telefone: '(11) 99999-1111', liderId: leader.id });

    const result = await adapter.listCabos(adminId, { page: 1, perPage: 50 });
    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.items.some(item => item.nome === 'Cabo B' && item.liderId === leader.id)).toBe(true);
    expect(result.items.some(item => item.nome === 'Cabo A' && item.liderId === undefined)).toBe(true);
  });
});
