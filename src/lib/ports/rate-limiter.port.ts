/**
 * Porta de rate limiting: permite trocar implementação (memória, Redis, edge)
 * sem alterar handlers HTTP ou regras de negócio.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Instantâneo em que a janela atual “expira” para este cliente (epoch ms). */
  resetAtEpochMs: number;
};

export interface RateLimiterPort {
  /**
   * Registra uma tentativa para `key` e retorna se ainda há cota.
   * Janela deslizante baseada em timestamps.
   */
  consume(key: string, maxRequests: number, windowMs: number): RateLimitResult;
}
