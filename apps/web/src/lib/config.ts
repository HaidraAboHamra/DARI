import 'server-only';

export const config = {
  apiUrl: process.env.API_URL ?? 'http://localhost:4000/api/v1',
  city: process.env.NEXT_PUBLIC_CITY ?? 'salamiyah',
  /** Secure cookies need HTTPS; a plain-HTTP test server sets COOKIE_SECURE=false. */
  secureCookies: (process.env.COOKIE_SECURE ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true',
} as const;
