// Helpers de autenticação para extrair e validar usuário via token Bearer.
// Mantém a lógica de sessão reutilizável entre os route handlers.

import { NextRequest } from 'next/server';
import { AppError } from '@/lib/errors';

function getBearerToken(request: NextRequest): string | null {
  const authorizationHeader = request.headers.get('authorization');
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}

function getUserIdFromMockToken(token: string): string | null {
  const prefix = 'mock-token-';
  if (!token.startsWith(prefix)) return null;

  const withoutPrefix = token.slice(prefix.length);
  const separatorIndex = withoutPrefix.lastIndexOf('-');
  if (separatorIndex <= 0) return null;

  const userId = withoutPrefix.slice(0, separatorIndex);
  const timestamp = withoutPrefix.slice(separatorIndex + 1);

  if (!userId || !/^\d+$/.test(timestamp)) return null;
  return userId;
}

export function requireAuthenticatedUserId(request: NextRequest): string {
  const token = getBearerToken(request);
  const userId = token ? getUserIdFromMockToken(token) : null;

  if (!userId) {
    throw new AppError('UNAUTHORIZED', 401, 'Usuário não autenticado.');
  }

  return userId;
}
