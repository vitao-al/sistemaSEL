import type { RateLimiterPort, RateLimitResult } from '@/lib/ports/rate-limiter.port';

/**
 * Implementação em memória com janela deslizante (timestamps).
 * Adequada a processo único ou demonstração; em cluster use Redis atrás da mesma porta.
 */
export class MemoryRateLimiter implements RateLimiterPort {
  private readonly buckets = new Map<string, number[]>();

  consume(key: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const cutoff = now - windowMs;

    let stamps = this.buckets.get(key);
    if (!stamps) {
      stamps = [];
      this.buckets.set(key, stamps);
    }

    const filtered = stamps.filter(t => t > cutoff);
    this.buckets.set(key, filtered);

    const oldestInWindow = filtered[0] ?? now;
    const resetAtEpochMs = oldestInWindow + windowMs;

    if (filtered.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAtEpochMs,
      };
    }

    filtered.push(now);
    this.buckets.set(key, filtered);

    const oldest = filtered[0] ?? now;
    return {
      allowed: true,
      remaining: maxRequests - filtered.length,
      resetAtEpochMs: oldest + windowMs,
    };
  }
}
