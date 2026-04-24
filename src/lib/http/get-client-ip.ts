import type { NextRequest } from 'next/server';

/**
 * Extrai o IP do cliente de forma agnóstica ao host (Vercel, nginx, local).
 * Não confia apenas no primeiro valor de x-forwarded-for sem validação em edge avançada;
 * para este app, a primeira entrada é o padrão comum atrás de proxy.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  // NextRequest pode expor ip em ambientes específicos
  const fromRequest = (request as NextRequest & { ip?: string | null }).ip;
  if (fromRequest) return fromRequest;

  return 'unknown';
}
