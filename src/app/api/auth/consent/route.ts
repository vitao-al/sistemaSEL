import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedScope } from '@/lib/auth/session';
import {
  CONSENT_COOKIE_MAX_AGE_SECONDS,
  CONSENT_COOKIE_NAME,
  COOKIE_POLICY_VERSION,
  TERMS_VERSION,
  serializeConsentCookie,
} from '@/lib/cookies';
import { AppError, buildErrorResponse } from '@/lib/errors';

const consentSchema = z.object({
  preferences: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const scope = requireAuthenticatedScope(request);
    const body = await request.json();
    const input = consentSchema.parse(body);

    const consent = {
      version: TERMS_VERSION,
      policyVersion: COOKIE_POLICY_VERSION,
      acceptedAt: new Date().toISOString(),
      userId: scope.userId,
      role: scope.role,
      essential: true as const,
      preferences: input.preferences,
      termsAccepted: true as const,
    };

    const response = NextResponse.json({ success: true, data: consent }, { status: 200 });
    response.cookies.set(CONSENT_COOKIE_NAME, serializeConsentCookie(consent), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CONSENT_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return buildErrorResponse(new AppError('VALIDATION_ERROR', 400, 'Dados inválidos para consentimento.', error.flatten()));
    }

    return buildErrorResponse(error, 'Falha ao registrar consentimento.');
  }
}
