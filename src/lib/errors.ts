// Mapeamento de erros da aplicação para um contrato HTTP consistente.
// Centraliza códigos, status e formato de resposta de falha.

import { NextResponse } from 'next/server';

type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR';

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

  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details ?? null,
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
