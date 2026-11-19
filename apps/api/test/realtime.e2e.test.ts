import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { createHarness, type Harness, loginAs } from './helpers/harness';

describe('realtime stream (e2e)', () => {
  let h: Harness;
  let base: string;
  beforeAll(async () => {
    h = await createHarness();
    await h.app.listen({ port: 0, host: '127.0.0.1' });
    base = await h.app.getUrl();
  });
  afterAll(() => h.close());

  it('pushes a notification to the connected user within the same second', async () => {
    const token = await loginAs(h.app, 'citizen');
    const me = (await h.app.inject({ method: 'GET', url: '/api/v1/me', headers: { authorization: `Bearer ${token}` } })).json();
    const controller = new AbortController();
    const res = await fetch(`${base.replace('[::1]', '127.0.0.1')}/api/v1/stream`, { headers: { authorization: `Bearer ${token}` }, signal: controller.signal });
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let received = '';
    const read = async (until: string) => {
      while (!received.includes(until)) received += decoder.decode((await reader.read()).value);
    };
    await read('event: ready');

    const started = Date.now();
    await h.app.get(NotificationsService).notify([{ userId: me.id, type: 'order.status', title: 'طلبك في الطريق إليك', body: 'D-TEST' }]);
    await read('طلبك في الطريق');
    expect(Date.now() - started).toBeLessThan(1000);
    expect(received).toContain('event: message');
    controller.abort();
  });

  it('rejects anonymous streams', async () => {
    const res = await fetch(`${base.replace('[::1]', '127.0.0.1')}/api/v1/stream`);
    expect(res.status).toBe(401);
  });
});
