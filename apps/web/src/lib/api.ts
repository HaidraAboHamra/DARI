import 'server-only';
import type { ApiErrorBody } from '@dari/contracts';
import { config } from './config';
import { accessToken } from './session';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Public data that may be cached by Next for N seconds (anonymous requests only). */
  revalidate?: number;
  /** Send the user's token (default true when a session exists). */
  authenticated?: boolean;
}

/** Typed server-side client for the Dari API. One place for auth, errors and caching. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${config.apiUrl}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const token = options.authenticated === false ? null : await accessToken();
  const cacheable = !token && options.revalidate !== undefined && (options.method ?? 'GET') === 'GET';

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      accept: 'application/json',
      ...(options.body !== undefined && { 'content-type': 'application/json' }),
      ...(token && { authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    ...(cacheable ? { next: { revalidate: options.revalidate } } : { cache: 'no-store' as const }),
  });

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(response.status, error?.code ?? 'UNKNOWN', error?.message ?? 'تعذر الاتصال بالخادم', error?.details);
  }
  return data as T;
}

/** Returns `null` instead of throwing on 404 — for pages that render notFound(). */
export async function apiOrNull<T>(path: string, options?: RequestOptions): Promise<T | null> {
  try {
    return await api<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
    throw err;
  }
}
