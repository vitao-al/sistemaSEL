/**
 * Políticas de segurança configuráveis por ambiente (valores padrão sensatos para app não comercial).
 */

function parseMs(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseCount(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const FIFTEEN_MIN = 15 * 60 * 1000;

export function getLoginRateLimitPolicy() {
  return {
    windowMs: parseMs(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, FIFTEEN_MIN),
    max: parseCount(process.env.RATE_LIMIT_LOGIN_MAX, 30),
  };
}

export function getForgotPasswordRateLimitPolicy() {
  return {
    windowMs: parseMs(process.env.RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS, FIFTEEN_MIN),
    max: parseCount(process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX, 10),
  };
}

export function getResetPasswordRateLimitPolicy() {
  return {
    windowMs: parseMs(process.env.RATE_LIMIT_RESET_PASSWORD_WINDOW_MS, FIFTEEN_MIN),
    max: parseCount(process.env.RATE_LIMIT_RESET_PASSWORD_MAX, 40),
  };
}
