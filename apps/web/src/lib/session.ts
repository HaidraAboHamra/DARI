import 'server-only';
import type { AuthTokens, PlatformRole } from '@dari/contracts';
import { cookies } from 'next/headers';
import { config } from './config';

/**
 * Tokens live in httpOnly cookies only: JavaScript in the page can never read
 * them (XSS-safe). The browser talks to Next (BFF), Next talks to the API.
 */
export const ACCESS_COOKIE = 'dari_at';
export const REFRESH_COOKIE = 'dari_rt';
const REFRESH_MAX_AGE = 30 * 86_400;

export interface SessionUser {
  id: string;
  role: PlatformRole;
}

export function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: config.secureCookies, sameSite: 'lax' as const, path: '/', maxAge };
}

export async function saveSession(tokens: AuthTokens): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(tokens.expiresIn));
  jar.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function accessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

/** Reads identity from the access token for UI decisions only; the API re-verifies every call. */
export async function currentUser(): Promise<SessionUser | null> {
  const token = await accessToken();
  if (!token) return null;
  const claims = decodeJwt(token);
  return claims ? { id: claims.sub, role: claims.role } : null;
}

export function decodeJwt(token: string): { sub: string; role: PlatformRole; exp: number } | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
