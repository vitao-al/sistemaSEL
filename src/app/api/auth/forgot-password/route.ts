// Endpoint de recuperação de senha.
// Gera token, salva no banco e envia email formatado para o usuário.
// Resposta sempre neutra: não revela se o email existe (segurança).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerServices } from '@/lib/database/server';
import { AppError, buildErrorResponse } from '@/lib/errors';
import { getForgotPasswordRateLimitPolicy } from '@/lib/config/security-policies';
import { getLogger } from '@/lib/infrastructure/logging/get-logger';
import { enforceRateLimit } from '@/lib/http/rate-limit-guard';

// Schema da entrada do fluxo de recuperação.
const forgotSchema = z.object({ email: z.string().email('Email inválido.') });

function getRequestBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  if (request.nextUrl?.origin) {
    return request.nextUrl.origin;
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
  try {
    const policy = getForgotPasswordRateLimitPolicy();
    const limited = enforceRateLimit(request, {
      scope: 'auth-forgot-password',
      max: policy.max,
      windowMs: policy.windowMs,
    });
    if (limited) return limited;

    const body = await request.json();
    const input = forgotSchema.parse(body);
    const { authService } = createServerServices();
    const baseUrl = getRequestBaseUrl(request);
    await authService.forgotPassword(input.email, baseUrl);
    // Sempre retorna sucesso — não revela se o email está cadastrado.
    return NextResponse.json(
      { success: true, data: { message: 'Se o email estiver cadastrado, você receberá as instruções em breve.' } },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos.', error.flatten()));
    }
    getLogger().child({ route: 'forgot-password' }).error('forgot_password_internal_error', {
      err: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: true, data: { message: 'Se o email estiver cadastrado, você receberá as instruções em breve.' } },
      { status: 200 }
    );
  }
}
