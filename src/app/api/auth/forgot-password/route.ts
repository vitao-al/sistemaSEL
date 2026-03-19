import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';

const forgotSchema = z.object({
  email: z.string().email('Email inválido.'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = forgotSchema.parse(body);

    const { authService } = createServerServices();
    await authService.forgotPassword(input.email);

    return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos.', error.flatten()));
    }
    return buildErrorResponse(error, 'Falha ao processar recuperação de senha.');
  }
}
