import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('../src/lib/secure-storage', () => ({
  secureStorage: {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => void store.set(k, v),
    remove: async (k: string) => void store.delete(k),
  },
}));
vi.mock('../src/lib/config', () => ({ config: { apiUrl: 'https://api.test/v1', city: 'salamiyah' } }));

const { ApiClient, ApiError } = await import('../src/lib/api');

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const tokens = (n: number) => ({ accessToken: `access-${n}`, refreshToken: `refresh-${n}`, expiresIn: 900, user: { id: 'u1' } });

describe('mobile ApiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    store.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('refreshes once for many parallel 401s and retries each request with the new token', async () => {
    const client = new ApiClient();
    await client.startSession(tokens(1) as never);
    let refreshes = 0;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        refreshes++;
        await new Promise((r) => setTimeout(r, 5));
        return json(200, tokens(2));
      }
      const auth = (init.headers as Record<string, string>).authorization;
      return auth === 'Bearer access-2' ? json(200, { ok: url }) : json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } });
    });

    const results = await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')]);
    expect(refreshes).toBe(1);
    expect(results).toHaveLength(3);
    expect(store.get('dari.refresh')).toBe('refresh-2');
  });

  it('ends the session when the refresh token is rejected, and surfaces the original 401', async () => {
    const client = new ApiClient();
    const sessions: unknown[] = [];
    client.listen((t) => sessions.push(t));
    await client.startSession(tokens(1) as never);
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/auth/refresh') ? json(401, {}) : json(401, { error: { code: 'UNAUTHORIZED', message: 'سجّل الدخول' } }),
    );

    await expect(client.get('/me')).rejects.toMatchObject({ status: 401, message: 'سجّل الدخول' });
    expect(store.has('dari.refresh')).toBe(false);
    expect(sessions.at(-1)).toBeNull();
  });

  it('keeps the session through a network failure during refresh (offline is not logout)', async () => {
    const client = new ApiClient();
    await client.startSession(tokens(1) as never);
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/refresh')) throw new TypeError('Network request failed');
      return json(401, {});
    });
    await expect(client.get('/me')).rejects.toBeInstanceOf(ApiError);
    expect(store.get('dari.refresh')).toBe('refresh-1');
  });

  it('serializes query params and skips empty values', async () => {
    const client = new ApiClient();
    fetchMock.mockResolvedValue(json(200, []));
    await client.get('/businesses', { city: 'salamiyah', vertical: 'food', categoryId: undefined, q: '' });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/v1/businesses?city=salamiyah&vertical=food');
  });
});

describe('server address (test builds)', () => {
  it('normalizes what testers type', async () => {
    vi.doMock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined } }));
    const { normalizeServerUrl } = await import('../src/lib/server');
    expect(normalizeServerUrl('192.168.1.20:4000')).toBe('http://192.168.1.20:4000/api/v1');
    expect(normalizeServerUrl('https://api.dari.sy/')).toBe('https://api.dari.sy/api/v1');
    expect(normalizeServerUrl('https://api.dari.sy/api/v1')).toBe('https://api.dari.sy/api/v1');
  });
});
