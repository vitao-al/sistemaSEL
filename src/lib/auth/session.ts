// Helpers de autenticação para extrair e validar sessão via token Bearer.

import { NextRequest } from 'next/server';
import { AppError } from '@/lib/errors';
import { SessionScope } from '@/lib/database/types';
import { verifyAuthToken } from './jwt';

function getBearerToken(request: NextRequest): string | null {
  const authorizationHeader = request.headers.get('authorization');
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}

export function requireAuthenticatedScope(request: NextRequest): SessionScope {
  const token = getBearerToken(request);
  const session = token ? verifyAuthToken(token) : null;

  if (!session) {
    throw new AppError('UNAUTHORIZED', 401, 'Usuário não autenticado.');
  }

  if (session.role === 'admin') {
    return {
      role: 'admin',
      userId: session.userId,
      adminId: session.userId,
    };
  }

  return {
    role: 'cabo',
    userId: session.userId,
    adminId: session.adminId,
    caboId: session.userId,
  };
}
