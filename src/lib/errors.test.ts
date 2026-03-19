// Testes unitários para garantir o comportamento do pipeline de erros padronizados.
// Valida conversões e assertions de domínio.

import { describe, expect, it } from 'vitest';
import { AppError, assertOrThrow, toAppError } from './errors';

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
