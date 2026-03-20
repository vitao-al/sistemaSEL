import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthRole } from '@/types';

type AuthTokenPayload = {
  sub: string;
  role: AuthRole;
  adminId?: string;
};

type VerifiedAuthToken = {
  userId: string;
  role: AuthRole;
  adminId?: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente para autenticação segura.');
  }

  return secret;
}

export function signAuthToken(payload: AuthTokenPayload) {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '30d',
    issuer: 'sistema-sel',
    audience: 'sistema-sel-api',
  });
}

export function verifyAuthToken(token: string): VerifiedAuthToken | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'sistema-sel',
      audience: 'sistema-sel-api',
    }) as JwtPayload;

    const role = decoded.role;
    const userId = decoded.sub;

    if ((role !== 'admin' && role !== 'cabo') || typeof userId !== 'string' || !userId) {
      return null;
    }

    const adminId = typeof decoded.adminId === 'string' ? decoded.adminId : undefined;

    return {
      role,
      userId,
      adminId,
    };
  } catch {
    return null;
  }
}
