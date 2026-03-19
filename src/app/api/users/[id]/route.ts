import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';

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
    const body = await request.json();
    const input = userUpdateSchema.parse(body);

    const { userService } = createServerServices();
    const user = await userService.updateUserProfile(params.id, input);

    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para atualizar usuário.', error.flatten()));
    }
    return buildErrorResponse(error, 'Falha ao atualizar perfil.');
  }
}
