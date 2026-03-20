// Endpoint de redefinição de senha via token.
// GET  → valida token e retorna tempo restante.
// POST → efetua a troca de senha se o token for válido.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';

type RouteParams = { params: { token: string } };

/** Valida o token e retorna quanto tempo resta (em segundos). */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = params;
    if (!token) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Token não informado.'));
    }

    const { authService } = createServerServices();
    const { expiresAt, email } = await authService.validateResetToken(token);

    const secondsLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    return NextResponse.json({
      success: true,
      data: { valid: true, expiresAt: expiresAt.toISOString(), secondsLeft, email },
    });
  } catch (error) {
    return buildErrorResponse(error, 'Token inválido ou expirado.');
  }
}

const resetSchema = z.object({
  novaSenha: z
    .string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres.')
    .max(128, 'Senha muito longa.'),
});

/** Redefine a senha com o token fornecido. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = params;
    if (!token) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Token não informado.'));
    }

    const body = await request.json();
    const { novaSenha } = resetSchema.parse(body);

    const { authService } = createServerServices();
    await authService.resetPassword(token, novaSenha);

    return NextResponse.json(
      { success: true, data: { message: 'Senha redefinida com sucesso! Faça o login com sua nova senha.' } },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao redefinir senha.');
  }
}
