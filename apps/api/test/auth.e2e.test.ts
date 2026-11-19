import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createHarness, type Harness } from './helpers/harness';

describe('auth (e2e)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  const phone = '0955111222';

  it('signs up with OTP and returns a normalized profile', async () => {
    const req = await h.app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone } });
    expect(req.statusCode).toBe(202);

    const bad = await h.app.inject({ method: 'POST', url: '/api/v1/auth/otp/verify', payload: { phone, code: '000000' } });
    expect(bad.statusCode).toBe(401);
    expect(bad.json().error.code).toBe('UNAUTHORIZED');

    const ok = await h.app.inject({ method: 'POST', url: '/api/v1/auth/otp/verify', payload: { phone, code: '123456' } });
    expect(ok.statusCode).toBe(200);
    const tokens = ok.json();
    expect(tokens.user.phone).toBe('+963955111222');

    const me = await h.app.inject({ method: 'GET', url: '/api/v1/me', headers: auth(tokens.accessToken) });
    expect(me.json()).toMatchObject({ phone: '+963955111222', role: 'citizen' });
  });

  it('consumes an OTP once', async () => {
    await h.app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone: '0955000001' } });
    const first = await h.app.inject({ method: 'POST', url: '/api/v1/auth/otp/verify', payload: { phone: '0955000001', code: '123456' } });
    const second = await h.app.inject({ method: 'POST', url: '/api/v1/auth/otp/verify', payload: { phone: '0955000001', code: '123456' } });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(401);
  });

  it('rate-limits OTP sends per phone', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await h.app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone: '0955000999' } });
      codes.push(r.statusCode);
    }
    expect(codes).toEqual([202, 202, 202, 429]);
  });

  it('rotates refresh tokens and revokes the session when an old token is replayed', async () => {
    await h.app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone: '0955000002' } });
    const login = (
      await h.app.inject({ method: 'POST', url: '/api/v1/auth/otp/verify', payload: { phone: '0955000002', code: '123456' } })
    ).json();

    const rotated = await h.app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: login.refreshToken } });
    expect(rotated.statusCode).toBe(200);
    const next = rotated.json();
    expect(next.refreshToken).not.toBe(login.refreshToken);

    // Attacker replays the old token → rejected and the whole session is killed.
    const replay = await h.app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: login.refreshToken } });
    expect(replay.statusCode).toBe(401);
    const victim = await h.app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: next.refreshToken } });
    expect(victim.statusCode).toBe(401);
  });

  it('rejects protected routes without a token and with a forged one', async () => {
    expect((await h.app.inject({ method: 'GET', url: '/api/v1/me' })).statusCode).toBe(401);
    const forged = await h.app.inject({ method: 'GET', url: '/api/v1/me', headers: auth('eyJhbGciOiJub25lIn0.e30.') });
    expect(forged.statusCode).toBe(401);
  });

  it('exposes health checks outside the API prefix', async () => {
    const ready = await h.app.inject({ method: 'GET', url: '/health/ready' });
    expect(ready.json()).toEqual({ status: 'ok', checks: { database: true, redis: true } });
  });
});
