import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie, requireAuthenticatedScope } from '@/lib/auth/session';
import { createServerServices } from '@/lib/database/server';
import { buildErrorResponse, AppError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const scope = requireAuthenticatedScope(request);
    const { userService } = createServerServices();
    const user = await userService.getCurrentUser(scope.role, scope.userId);

    if (!user) {
      throw new AppError('UNAUTHORIZED', 401, 'Sessão inválida ou expirada.');
    }

    return NextResponse.json({ success: true, data: { user } }, { status: 200 });
  } catch (error) {
    const response = buildErrorResponse(error, 'Falha ao recuperar sessão.');
    if (response.status === 401) {
      clearAuthCookie(response);
    }
    return response;
  }
}
