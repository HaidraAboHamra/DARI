import { normalizeArabic } from '@dari/contracts';

/** Builds the normalized text indexed by pg_trgm for any searchable entity. */
export function buildSearchText(...parts: (string | null | undefined)[]): string {
  return normalizeArabic(parts.filter(Boolean).join(' ')).slice(0, 4000);
}
