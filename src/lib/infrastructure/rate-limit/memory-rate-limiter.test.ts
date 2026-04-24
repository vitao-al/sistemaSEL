import { describe, expect, it } from 'vitest';
import { MemoryRateLimiter } from './memory-rate-limiter';

describe('MemoryRateLimiter', () => {
  it('permite requisições até o limite e bloqueia a seguir', () => {
    const limiter = new MemoryRateLimiter();
    const key = 'k1';
    const windowMs = 60_000;
    const max = 3;

    expect(limiter.consume(key, max, windowMs).allowed).toBe(true);
    expect(limiter.consume(key, max, windowMs).allowed).toBe(true);
    expect(limiter.consume(key, max, windowMs).allowed).toBe(true);
    expect(limiter.consume(key, max, windowMs).allowed).toBe(false);
  });

  it('isola contadores por chave', () => {
    const limiter = new MemoryRateLimiter();
    const windowMs = 60_000;
    expect(limiter.consume('a', 1, windowMs).allowed).toBe(true);
    expect(limiter.consume('b', 1, windowMs).allowed).toBe(true);
  });
});
