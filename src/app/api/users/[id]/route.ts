// Endpoint de atualização de perfil do usuário.
// Valida payload e delega persistência ao serviço de domínio.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { requireAuthenticatedScope } from '@/lib/auth/session';

// Campos permitidos para atualização de perfil.
const userUpdateSchema = z.object({
  nome: z.string().optional(),
  email: z.string().email().optional(),
  avatar: z.string().optional(),
  cargo: z.string().optional(),
});

type RouteParams = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const scope = requireAuthenticatedScope(request);
    const role = request.nextUrl.searchParams.get('role');

    if (params.id !== scope.userId) {
      throw new AppError('FORBIDDEN', 403, 'Não autorizado a atualizar este perfil.');
    }

    if (role !== 'admin' && role !== 'cabo') {
      throw new AppError('VALIDATION_ERROR', 400, 'Role inválida para atualização de perfil.');
    }

    // 1) Lê e valida payload da atualização.
    const body = await request.json();
    const input = userUpdateSchema.parse(body);

    // 2) Executa atualização no serviço de usuário.
    const { userService } = createServerServices();
    const user = await userService.updateUserProfile(role, params.id, input);

    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error) {
    // Erro de contrato de entrada (400).
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para atualizar usuário.', error.flatten()));
    }

    // Erros de domínio/infra (tratados no helper).
    return buildErrorResponse(error, 'Falha ao atualizar perfil.');
  }
}
