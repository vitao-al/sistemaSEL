import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';

const registerSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório.'),
  email: z.string().email('Email inválido.'),
  senha: z.string().min(6, 'Senha precisa ter ao menos 6 caracteres.'),
  titulo: z.string().min(1, 'Título obrigatório.'),
  zona: z.string().min(1, 'Zona obrigatória.'),
  adminId: z.string().min(1, 'Admin obrigatório.'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = registerSchema.parse(body);

    const { caboService } = createServerServices();
    const cabo = await caboService.createCabo(
      { role: 'admin', userId: input.adminId, adminId: input.adminId },
      {
        nome: input.nome,
        email: input.email,
        senha: input.senha,
        titulo: input.titulo,
        zona: input.zona,
      }
    );

    return NextResponse.json({ success: true, data: cabo }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para cadastro.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao cadastrar cabo eleitoral.');
  }
}
