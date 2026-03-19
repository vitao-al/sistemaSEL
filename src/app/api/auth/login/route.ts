// Endpoint de autenticação por email/senha.
// Valida entrada, executa login no domínio e retorna token + perfil.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { buildErrorResponse, AppError } from '@/lib/errors';

// Schema de entrada para login.
// Aqui garantimos que os campos mínimos foram enviados antes de chegar na regra de negócio.
const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  senha: z.string().min(1, 'Senha obrigatória.'),
});

export async function POST(request: NextRequest) {
  try {
    // 1) Lê e valida o body da requisição.
    const body = await request.json();
    const input = loginSchema.parse(body);

    // 2) Executa a regra de autenticação no service.
    const { authService } = createServerServices();
    const result = await authService.login(input.email, input.senha);

    // 3) Retorna envelope padrão da API.
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    // Erros de validação (400) ficam explícitos para o frontend.
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para login.', error.flatten()));
    }

    // Demais erros são convertidos para o formato padrão no helper central.
    return buildErrorResponse(error, 'Falha no login.');
  }
}
