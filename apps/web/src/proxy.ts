import type { AuthTokens } from '@dari/contracts';
import { type NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'dari_at';
const REFRESH_COOKIE = 'dari_rt';
const REFRESH_EARLY_SECONDS = 60;
const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';

/**
 * Silent session refresh: when the short-lived access token is missing or about
 * to expire, rotate it with the refresh token before rendering, so pages and
 * server actions always see a valid session.
 */
export async function proxy(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken || !needsRefresh(request.cookies.get(ACCESS_COOKIE)?.value)) return NextResponse.next();

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  }).catch(() => null);

  if (!res?.ok) {
    if (res && res.status === 401) {
      const out = NextResponse.next();
      out.cookies.delete(ACCESS_COOKIE);
      out.cookies.delete(REFRESH_COOKIE);
      return out;
    }
    return NextResponse.next();
  }

  const tokens = (await res.json()) as AuthTokens;
  // Make the new token visible to this render, and persist both cookies.
  request.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  const out = NextResponse.next({ request: { headers: request.headers } });
  const base = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
  out.cookies.set(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: tokens.expiresIn });
  out.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: 30 * 86_400 });
  return out;
}

function needsRefresh(token: string | undefined): boolean {
  if (!token) return true;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as { exp: number };
    return exp - Date.now() / 1000 < REFRESH_EARLY_SECONDS;
  } catch {
    return true;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|manifest|api/events|.*\\.(?:svg|png|jpg|webp|ico)$).*)'],
};
