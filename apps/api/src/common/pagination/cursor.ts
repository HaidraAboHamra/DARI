import type { Page } from '@dari/contracts';
import { ValidationError } from '../errors/app-error';

/**
 * Opaque keyset cursors. OFFSET pagination degrades linearly with depth;
 * keyset stays O(log n) on page 1 and page 10,000 alike.
 */
export function encodeCursor(values: readonly (string | number)[]): string {
  return Buffer.from(JSON.stringify(values)).toString('base64url');
}

export function decodeCursor<T extends readonly (string | number)[]>(cursor: string | undefined, arity: number): T | null {
  if (!cursor) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(parsed) && parsed.length === arity) return parsed as unknown as T;
  } catch {
    /* fall through */
  }
  throw new ValidationError('مؤشر الصفحة غير صالح');
}

/**
 * Builds a page from `limit + 1` fetched rows: the extra row only signals that
 * another page exists and is never returned.
 */
export function toPage<Row, Item>(
  rows: Row[],
  limit: number,
  map: (row: Row) => Item,
  cursorOf: (row: Row) => readonly (string | number)[],
): Page<Item> {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows.at(-1);
  return {
    items: pageRows.map(map),
    nextCursor: hasMore && last ? encodeCursor(cursorOf(last)) : null,
  };
}
