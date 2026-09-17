import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';

export async function POST() {
  return buildErrorResponse(new AppError('FORBIDDEN', 403, 'O cadastro de cabo foi desativado. Acesso exclusivo do admin.'), 'Cadastro de cabo desativado.');
}
