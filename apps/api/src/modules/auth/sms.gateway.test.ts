import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpSmsGateway, WhatsAppCloudGateway } from './sms.gateway';

describe('SMS gateways', () => {
  afterEach(() => vi.restoreAllMocks());

  it('posts JSON to a generic HTTP provider with the bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await new HttpSmsGateway('https://sms.example/send', 'secret', 'DARI').send('+963933123456', 'رمز: 123456', '123456');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://sms.example/send');
    expect((init!.headers as Record<string, string>).authorization).toBe('Bearer secret');
    expect(JSON.parse(init!.body as string)).toEqual({ to: '+963933123456', from: 'DARI', text: 'رمز: 123456' });
  });

  it('binds the code into an approved WhatsApp template', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await new WhatsAppCloudGateway('123', 'tok', 'dari_otp').send('+963933123456', 'ignored', '654321');
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body).toMatchObject({ to: '963933123456', template: { name: 'dari_otp', language: { code: 'ar' } } });
    expect(body.template.components[0].parameters[0].text).toBe('654321');
  });

  it('surfaces provider failures so the OTP request fails loudly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 502 }));
    await expect(new HttpSmsGateway('https://sms.example/send', undefined, 'DARI').send('+1', 'x', '1')).rejects.toThrow('502');
  });
});
