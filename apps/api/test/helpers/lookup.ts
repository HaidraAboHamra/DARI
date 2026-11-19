import type { NestFastifyApplication } from '@nestjs/platform-fastify';

/** Finds a seeded business by its Arabic name through the public API. */
export async function businessByName(app: NestFastifyApplication, name: string): Promise<{ id: string; slug: string }> {
  const res = await app.inject({ method: 'GET', url: '/api/v1/businesses?city=salamiyah&limit=50' });
  const found = res.json().items.find((b: { name: string }) => b.name === name);
  if (!found) throw new Error(`seed business not found: ${name}`);
  return found;
}

/** Local (Damascus) calendar date `days` from now. */
export function localDatePlus(days: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Damascus' }).format(new Date(Date.now() + days * 86_400_000));
}
