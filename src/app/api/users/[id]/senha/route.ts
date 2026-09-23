// Endpoint de troca de senha do usuário.
// Exige senha atual e validação de política mínima da nova senha.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';
import { getChangePasswordRateLimitPolicy } from '@/lib/config/security-policies';
import { enforceRateLimit } from '@/lib/http/rate-limit-guard';

// Regra mínima de troca de senha.
const senhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Senha atual é obrigatória.'),
  novaSenha: z.string().min(6, 'A nova senha precisa ter ao menos 6 caracteres.'),
});

type RouteParams = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const policy = getChangePasswordRateLimitPolicy();
    const limited = enforceRateLimit(request, {
      scope: 'auth-user-senha',
      max: policy.max,
      windowMs: policy.windowMs,
    });
    if (limited) return limited;

    const scope = requireAuthenticatedScope(request);

    if (params.id !== scope.userId) {
      throw new AppError('FORBIDDEN', 403, 'Não autorizado a alterar esta senha.');
    }

    const role = scope.role;

    // 1) Parse e validação do payload.
    const body = await request.json();
    const input = senhaSchema.parse(body);

    // 2) Troca de senha no serviço de usuário.
    const { userService } = createServerServices();
    await userService.updateUserSenha(role, params.id, input.senhaAtual, input.novaSenha);

    return NextResponse.json({ success: true, data: { ok: true } }, { status: 200 });
  } catch (error) {
    // Erro de entrada inválida.
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para troca de senha.', error.flatten()));
    }

    // Erro de negócio/infraestrutura.
    return buildErrorResponse(error, 'Falha ao atualizar senha.');
  }
}
