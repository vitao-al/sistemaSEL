// Mapeamento de erros da aplicação para um contrato HTTP consistente.
// Centraliza códigos, status e formato de resposta de falha.

import { NextResponse } from 'next/server';
import { getLogger } from '@/lib/infrastructure/logging/get-logger';

type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMIT_EXCEEDED';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Evita poluir logs em `next build` com erros esperados de rotas dinâmicas. */
function shouldLogServerError(appError: AppError): boolean {
  const msg = appError.message;
  if (msg.includes('Dynamic server usage')) return false;
  if (msg.includes("couldn't be rendered statically")) return false;
  return true;
}

export function toAppError(error: unknown, fallbackMessage = 'Erro interno do servidor.'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError('INTERNAL_ERROR', 500, error.message);
  }

  return new AppError('INTERNAL_ERROR', 500, fallbackMessage);
}

export function buildErrorResponse(error: unknown, fallbackMessage?: string) {
  const appError = toAppError(error, fallbackMessage);

  if (appError.status >= 500 && shouldLogServerError(appError)) {
    const log = getLogger().child({ layer: 'http' });
    log.error('request_failed', {
      code: appError.code,
      status: appError.status,
      message: appError.message,
    });
  }

  // Garante que o cliente nunca receba nomes de funções, código ou mensagens de erro interno
  const isInternal = appError.status >= 500;
  const hasFunctionOrCode = appError.message.includes('(') || appError.message.includes('at ') || appError.message.includes('function');
  const safeMessage = (isInternal || hasFunctionOrCode)
    ? (fallbackMessage || 'Erro interno do servidor. Tente novamente mais tarde.')
    : appError.message;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError.code,
        message: safeMessage,
        details: isInternal ? null : (appError.details ?? null),
      },
    },
    { status: appError.status }
  );
}

export function assertOrThrow(condition: unknown, message: string, status = 400, code: ErrorCode = 'VALIDATION_ERROR') {
  if (!condition) {
    throw new AppError(code, status, message);
  }
}
