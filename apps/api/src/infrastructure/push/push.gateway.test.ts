import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpoPushGateway } from './push.gateway';

describe('ExpoPushGateway', () => {
  afterEach(() => vi.restoreAllMocks());

  it('batches messages and reports unregistered devices', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const sent = JSON.parse((init as RequestInit).body as string) as unknown[];
      return new Response(JSON.stringify({ data: sent.map((_, i) => (i === 0 ? { status: 'error', details: { error: 'DeviceNotRegistered' } } : { status: 'ok' })) }));
    });
    const messages = Array.from({ length: 150 }, (_, i) => ({ token: `ExponentPushToken[${i}]`, title: 'طلب جديد', body: 'D-1' }));
    const result = await new ExpoPushGateway('tok').send(messages);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.invalidTokens).toEqual(['ExponentPushToken[0]', 'ExponentPushToken[100]']);
    expect(((fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>).authorization).toBe('Bearer tok');
  });
});
