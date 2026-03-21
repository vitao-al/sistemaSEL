import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth/session';

export async function POST() {
  const response = NextResponse.json({ success: true, data: { loggedOut: true } }, { status: 200 });
  clearAuthCookie(response);
  return response;
}
