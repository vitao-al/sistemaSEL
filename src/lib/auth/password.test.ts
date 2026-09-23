import { describe, expect, it } from 'vitest';
import { hashPassword, isPasswordHashed, verifyPassword } from './password';

describe('password utility', () => {
  it('gera hash bcrypt válido', () => {
    const hash = hashPassword('minhasenha123');
    expect(isPasswordHashed(hash)).toBe(true);
    expect(hash).not.toBe('minhasenha123');
  });

  it('verifica senha correta com hash bcrypt', () => {
    const hash = hashPassword('minhasenha123');
    expect(verifyPassword('minhasenha123', hash)).toBe(true);
    expect(verifyPassword('senhaerrada', hash)).toBe(false);
  });

  it('suporta verificação de senha legada em texto puro com migração', () => {
    expect(isPasswordHashed('123456')).toBe(false);
    expect(verifyPassword('123456', '123456')).toBe(true);
    expect(verifyPassword('outrasenha', '123456')).toBe(false);
  });

  it('retorna false para valores nulos ou vazios', () => {
    expect(verifyPassword('', '123456')).toBe(false);
    expect(verifyPassword('123456', '')).toBe(false);
    expect(verifyPassword('123456', null)).toBe(false);
  });
});
