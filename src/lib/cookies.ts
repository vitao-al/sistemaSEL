import { AuthRole } from '@/types';

export const AUTH_COOKIE_NAME = 'sistema_sel_auth';
export const CONSENT_COOKIE_NAME = 'sistema_sel_consent';
export const THEME_COOKIE_NAME = 'sistema_sel_theme';

export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const TERMS_VERSION = '2026-03-20';
export const COOKIE_POLICY_VERSION = '2026-03-20';

export type ThemePreference = 'light' | 'dark' | 'system';

export type ConsentCookiePayload = {
  version: string;
  policyVersion: string;
  acceptedAt: string;
  userId: string;
  role: AuthRole;
  essential: true;
  preferences: boolean;
  termsAccepted: true;
};

export function serializeConsentCookie(payload: ConsentCookiePayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

export function parseConsentCookie(value?: string | null): ConsentCookiePayload | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<ConsentCookiePayload>;

    if (
      typeof parsed.version !== 'string' ||
      typeof parsed.policyVersion !== 'string' ||
      typeof parsed.acceptedAt !== 'string' ||
      typeof parsed.userId !== 'string' ||
      (parsed.role !== 'admin' && parsed.role !== 'cabo') ||
      parsed.essential !== true ||
      typeof parsed.preferences !== 'boolean' ||
      parsed.termsAccepted !== true
    ) {
      return null;
    }

    return parsed as ConsentCookiePayload;
  } catch {
    return null;
  }
}

export function isConsentCurrent(consent: ConsentCookiePayload | null, userId: string) {
  return Boolean(
    consent &&
      consent.userId === userId &&
      consent.version === TERMS_VERSION &&
      consent.policyVersion === COOKIE_POLICY_VERSION &&
      consent.termsAccepted
  );
}

export function readBrowserCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const prefix = `${name}=`;
  const parts = document.cookie.split(';').map(item => item.trim());
  const match = parts.find(item => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

export function writeBrowserCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;

  const secureFlag = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
}

export function deleteBrowserCookie(name: string) {
  if (typeof document === 'undefined') return;

  const secureFlag = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
}
