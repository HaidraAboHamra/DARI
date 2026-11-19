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

describe('metrics', () => {
  it('exposes Prometheus metrics with route templates, not raw URLs', async () => {
    const h = await createHarness();
    try {
      await h.app.inject({ method: 'GET', url: '/api/v1/cities' });
      await h.app.inject({ method: 'GET', url: '/api/v1/businesses/by-slug/anything-123' });
      const res = await h.app.inject({ method: 'GET', url: '/metrics' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('dari_http_request_duration_seconds_bucket');
      expect(res.body).toContain('route="/api/v1/businesses/by-slug/:slug"');
      expect(res.body).not.toContain('anything-123');
      expect(res.body).toContain('dari_outbox_backlog');
    } finally {
      await h.close();
    }
  });
});

describe('phone push', () => {
  it('registers devices and pushes notifications to them, forgetting dead tokens', async () => {
    const { PushGateway } = await import('../src/infrastructure/push/push.gateway');
    const h = await createHarness();
    try {
      const token = await loginAs(h.app, 'citizen');
      const headers = { authorization: `Bearer ${token}` };
      const reg = (t: string) => h.app.inject({ method: 'PUT', url: '/api/v1/me/devices', headers, payload: { token: t, platform: 'android' } });
      expect((await reg('ExponentPushToken[alive-1234567]')).statusCode).toBe(204);
      expect((await reg('ExponentPushToken[dead-12345678]')).statusCode).toBe(204);

      const sent: string[] = [];
      const gateway = h.app.get(PushGateway);
      gateway.send = async (messages) => {
        sent.push(...messages.map((m) => `${m.token}|${m.title}`));
        return { invalidTokens: ['ExponentPushToken[dead-12345678]'] };
      };
      const me = (await h.app.inject({ method: 'GET', url: '/api/v1/me', headers })).json();
      await h.app.get(NotificationsService).notify([{ userId: me.id, type: 'order.status', title: 'طلبك جاهز', body: 'D-1' }]);
      expect(sent.sort()).toEqual(['ExponentPushToken[alive-1234567]|طلبك جاهز', 'ExponentPushToken[dead-12345678]|طلبك جاهز']);

      sent.length = 0;
      await h.app.get(NotificationsService).notify([{ userId: me.id, type: 'order.status', title: 'تم التوصيل', body: 'D-1' }]);
      expect(sent).toEqual(['ExponentPushToken[alive-1234567]|تم التوصيل']);
    } finally {
      await h.close();
    }
  });
});
