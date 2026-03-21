// Helpers de autenticação para extrair e validar sessão via cookie HttpOnly e, por compatibilidade, Bearer token.

import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { SessionScope } from '@/lib/database/types';
import { AUTH_COOKIE_MAX_AGE_SECONDS, AUTH_COOKIE_NAME } from '@/lib/cookies';
import { verifyAuthToken } from './jwt';

function buildScopeFromSession(session: ReturnType<typeof verifyAuthToken>): SessionScope | null {
  if (!session) return null;

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

function getBearerToken(request: NextRequest): string | null {
  const authorizationHeader = request.headers.get('authorization');
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}

function getCookieToken(request: NextRequest): string | null {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
}

function getRequestToken(request: NextRequest): string | null {
  return getCookieToken(request) ?? getBearerToken(request);
}

export function getAuthenticatedScope(request: NextRequest): SessionScope | null {
  const token = getRequestToken(request);
  const session = token ? verifyAuthToken(token) : null;
  return buildScopeFromSession(session);
}

export function requireAuthenticatedScope(request: NextRequest): SessionScope {
  const scope = getAuthenticatedScope(request);

  if (!scope) {
    throw new AppError('UNAUTHORIZED', 401, 'Usuário não autenticado.');
  }

  return scope;
}

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...baseCookieOptions,
    maxAge: 0,
  });
}
