import type { RateLimiterPort } from '@/lib/ports/rate-limiter.port';
import { MemoryRateLimiter } from './memory-rate-limiter';

const globalKey = '__sistema_sel_rate_limiter__';

/**
 * Instância compartilhada no servidor (evita múltiplos contadores no hot reload em dev).
 */
export function getServerRateLimiter(): RateLimiterPort {
  const g = globalThis as typeof globalThis & { [globalKey]?: RateLimiterPort };
  if (!g[globalKey]) {
    g[globalKey] = new MemoryRateLimiter();
  }
  return g[globalKey]!;
}
