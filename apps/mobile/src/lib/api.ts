import type { ApiErrorBody, AuthTokens } from '@dari/contracts';
import { config } from './config';
import { secureStorage } from './secure-storage';

const REFRESH_KEY = 'dari.refresh';

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

type Query = Record<string, string | number | boolean | undefined | null>;
interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  headers?: Record<string, string>;
}

/**
 * Typed client for the Dari API. The access token lives in memory only; the
 * refresh token in the device keychain. A 401 triggers one shared refresh
 * (single-flight) and a single retry, so parallel requests never race to rotate.
 */
export class ApiClient {
  private baseUrl: string = config.apiUrl;
  private accessToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;
  private onSessionChange: ((tokens: AuthTokens | null) => void) | null = null;

  /** Test builds can point the app at another server (see `server.ts`). */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  get serverUrl(): string {
    return this.baseUrl;
  }

  listen(callback: (tokens: AuthTokens | null) => void): void {
    this.onSessionChange = callback;
  }

  async startSession(tokens: AuthTokens): Promise<void> {
    this.accessToken = tokens.accessToken;
    await secureStorage.set(REFRESH_KEY, tokens.refreshToken);
    this.onSessionChange?.(tokens);
  }

  async endSession(): Promise<void> {
    this.accessToken = null;
    await secureStorage.remove(REFRESH_KEY);
    this.onSessionChange?.(null);
  }

  /** Restores a session at app start from the stored refresh token. */
  async restore(): Promise<boolean> {
    return this.refresh();
  }

  async request<T>(path: string, options: Options = {}, retried = false): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    const response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers: {
        accept: 'application/json',
        ...(options.body !== undefined && { 'content-type': 'application/json' }),
        ...(this.accessToken && { authorization: `Bearer ${this.accessToken}` }),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401 && !retried && (await this.refresh())) return this.request<T>(path, options, true);
    if (response.status === 204) return undefined as T;
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = (data as ApiErrorBody | null)?.error;
      throw new ApiError(response.status, error?.code ?? 'UNKNOWN', error?.message ?? 'تعذر الاتصال بالخادم', error?.details);
    }
    return data as T;
  }

  get<T>(path: string, query?: Query) {
    return this.request<T>(path, { query });
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, { method: 'POST', body, headers });
  }

  private refresh(): Promise<boolean> {
    this.refreshing ??= (async () => {
      try {
        const refreshToken = await secureStorage.get(REFRESH_KEY);
        if (!refreshToken) return false;
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          if (res.status === 401) await this.endSession();
          return false;
        }
        await this.startSession((await res.json()) as AuthTokens);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }
}

export const api = new ApiClient();

export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'تعذر الاتصال، تحقق من الإنترنت';
}
