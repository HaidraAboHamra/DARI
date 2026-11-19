import { rm } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createHarness, type Harness, loginAs } from './helpers/harness';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

function multipart(filename: string, contentType: string, bytes: Buffer) {
  const boundary = '----dari-test-boundary';
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload: body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

describe('media uploads (e2e)', () => {
  let h: Harness;
  let token: string;
  beforeAll(async () => {
    process.env.UPLOAD_DIR = './uploads-test';
    h = await createHarness();
    token = await loginAs(h.app, 'citizen');
  });
  afterAll(async () => {
    await h.close();
    await rm('./uploads-test', { recursive: true, force: true });
  });

  it('stores a real image and serves it with immutable caching', async () => {
    const req = multipart('photo.png', 'image/png', PNG);
    const res = await h.app.inject({ method: 'POST', url: '/api/v1/media', headers: { ...auth(token), ...req.headers }, payload: req.payload });
    expect(res.statusCode).toBe(201);
    const { url, contentType, size } = res.json();
    expect(contentType).toBe('image/png');
    expect(size).toBe(PNG.length);

    const served = await h.app.inject({ method: 'GET', url: new URL(url).pathname });
    expect(served.statusCode).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['cache-control']).toContain('immutable');
    expect(served.rawPayload.equals(PNG)).toBe(true);
  });

  it('rejects files that only pretend to be images', async () => {
    const req = multipart('evil.png', 'image/png', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'));
    const res = await h.app.inject({ method: 'POST', url: '/api/v1/media', headers: { ...auth(token), ...req.headers }, payload: req.payload });
    expect(res.statusCode).toBe(400);
  });

  it('requires authentication and blocks path traversal', async () => {
    const req = multipart('photo.png', 'image/png', PNG);
    expect((await h.app.inject({ method: 'POST', url: '/api/v1/media', headers: req.headers, payload: req.payload })).statusCode).toBe(401);
    expect((await h.app.inject({ method: 'GET', url: '/media/2026/11/..%2F..%2Fpackage.json' })).statusCode).toBe(404);
  });
});
