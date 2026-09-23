import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BCRYPT_PREFIX_REGEX = /^\$2[abxy]\$\d{2}\$[./0-9A-Za-z]{53}$/;

/**
 * Verifica se a string armazenada é um hash bcrypt válido.
 */
export function isPasswordHashed(value?: string | null): boolean {
  if (!value) return false;
  return BCRYPT_PREFIX_REGEX.test(value);
}

/**
 * Gera um hash seguro da senha utilizando bcrypt com salt rounds de fator 10.
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * Compara a senha informada com o valor armazenado.
 * Suporta tanto hashes bcrypt quanto compatibilidade retroativa com senhas legadas,
 * utilizando comparação resistente a timing attacks quando aplicável.
 */
export function verifyPassword(password: string, hashOrPlain?: string | null): boolean {
  if (!hashOrPlain || !password) return false;

  if (isPasswordHashed(hashOrPlain)) {
    try {
      return bcrypt.compareSync(password, hashOrPlain);
    } catch {
      return false;
    }
  }

  // Compatibilidade transitória para senhas legadas ainda em texto puro.
  // Utiliza timingSafeEqual para evitar vazamento de tamanho/tempo na comparação.
  const a = Buffer.from(password);
  const b = Buffer.from(hashOrPlain);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
