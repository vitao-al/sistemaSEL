// Endpoint de recuperação de senha.
// Processa o email informado e mantém resposta neutra para o frontend.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';

// Schema da entrada do fluxo de recuperação.
const forgotSchema = z.object({
  email: z.string().email('Email inválido.'),
});

export async function POST(request: NextRequest) {
  try {
    // 1) Parse e validação dos dados enviados.
    const body = await request.json();
    const input = forgotSchema.parse(body);

    // 2) Chamada de domínio para verificar existência do email.
    const { authService } = createServerServices();
    await authService.forgotPassword(input.email);

    // 3) Resposta simples de sucesso.
    return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
  } catch (error) {
    // Retorna erro amigável de validação para o frontend.
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos.', error.flatten()));
    }

    // Mantém contrato de erro unificado.
    return buildErrorResponse(error, 'Falha ao processar recuperação de senha.');
  }
}
