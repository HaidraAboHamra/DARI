import 'server-only';

export const config = {
  apiUrl: process.env.API_URL ?? 'http://localhost:4000/api/v1',
  city: process.env.NEXT_PUBLIC_CITY ?? 'salamiyah',
  secureCookies: process.env.NODE_ENV === 'production',
} as const;
