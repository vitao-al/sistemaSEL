// Endpoint de recuperação de senha.
// Gera token, salva no banco e envia email formatado para o usuário.
// Resposta sempre neutra: não revela se o email existe (segurança).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';

// Schema da entrada do fluxo de recuperação.
const forgotSchema = z.object({ email: z.string().email('Email inválido.') });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = forgotSchema.parse(body);
    const { authService } = createServerServices();
    await authService.forgotPassword(input.email);
    // Sempre retorna sucesso — não revela se o email está cadastrado.
    return NextResponse.json(
      { success: true, data: { message: 'Se o email estiver cadastrado, você receberá as instruções em breve.' } },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos.', error.flatten()));
    }
    console.error('[forgot-password] Erro interno:', error);
    return NextResponse.json(
      { success: true, data: { message: 'Se o email estiver cadastrado, você receberá as instruções em breve.' } },
      { status: 200 }
    );
  }
}
