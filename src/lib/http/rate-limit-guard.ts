import { NextRequest, NextResponse } from 'next/server';
import { getServerRateLimiter } from '@/lib/infrastructure/rate-limit/server-singleton';
import { getClientIp } from './get-client-ip';

export type RateLimitGuardOptions = {
  /** Prefixo estável para isolar contadores (ex.: auth-login). */
  scope: string;
  max: number;
  windowMs: number;
};

/**
 * Retorna `null` se a requisição pode prosseguir; caso contrário, resposta HTTP 429.
 * Acopla apenas a infraestrutura de rate limit + IP, não à regra de negócio.
 */
export function enforceRateLimit(request: NextRequest, options: RateLimitGuardOptions): NextResponse | null {
  const ip = getClientIp(request);
  const key = `${options.scope}:${ip}`;
  const limiter = getServerRateLimiter();
  const result = limiter.consume(key, options.max, options.windowMs);

  if (result.allowed) {
    return null;
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAtEpochMs - Date.now()) / 1000));

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas tentativas. Aguarde um momento e tente novamente.',
        details: { retryAfterSeconds },
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}
