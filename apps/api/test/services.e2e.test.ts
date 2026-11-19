import type { ServiceRequest } from '@dari/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createHarness, type Harness, login, loginAs } from './helpers/harness';
import { businessByName } from './helpers/lookup';
import { outboxRelay } from './helpers/worker';

describe('Provider OS (e2e)', () => {
  let h: Harness;
  let citizen: string;
  let providerA: string; // admin owns "أبو سامر للسباكة"
  let providerB: string;
  let shopA: string;
  let shopB: string;
  let plumbingCategoryId: string;

  beforeAll(async () => {
    h = await createHarness();
    [citizen, providerA] = await Promise.all([loginAs(h.app, 'citizen'), loginAs(h.app, 'admin')]);
    shopA = (await businessByName(h.app, 'أبو سامر للسباكة')).id;
    const categories = (await h.app.inject({ method: 'GET', url: '/api/v1/categories?vertical=services' })).json();
    plumbingCategoryId = categories.find((c: { slug: string }) => c.slug === 'plumbing').id;

    providerB = await login(h.app, '0933777888');
    const created = await h.app.inject({
      method: 'POST',
      url: '/api/v1/businesses',
      headers: auth(providerB),
      payload: { citySlug: 'salamiyah', name: 'سباكة الأمانة', vertical: 'services', categoryId: plumbingCategoryId },
    });
    shopB = created.json().id;
    await h.app.inject({ method: 'PATCH', url: `/api/v1/admin/businesses/${shopB}/status`, headers: auth(providerA), payload: { status: 'active' } });
  });
  afterAll(() => h.close());

  it('runs request → competing quotes → accept → progress → completion', async () => {
    const created = await h.app.inject({
      method: 'POST',
      url: '/api/v1/service-requests',
      headers: auth(citizen),
      payload: { citySlug: 'salamiyah', categoryId: plumbingCategoryId, description: 'تسريب مي تحت المغسلة', address: 'الحي الشمالي، بناء 7، طابق 2', urgency: 'now' },
    });
    expect(created.statusCode).toBe(201);
    const request = created.json<ServiceRequest>();
    expect(request).toMatchObject({ status: 'open', categoryName: 'سباكة', quotes: [] });
    expect(request.number).toMatch(/^S-/);

    await outboxRelay(h.app).drainOnce();
    const notifiedB = (await h.app.inject({ method: 'GET', url: '/api/v1/me/notifications', headers: auth(providerB) })).json();
    expect(notifiedB.items.map((n: { type: string }) => n.type)).toContain('service.requested');

    // Providers see the need but not the customer's phone or exact address before assignment.
    const inboxB = (await h.app.inject({ method: 'GET', url: `/api/v1/provider/requests?businessId=${shopB}`, headers: auth(providerB) })).json();
    const seen = inboxB.items.find((r: ServiceRequest) => r.id === request.id);
    expect(seen).toMatchObject({ customerPhone: null });
    expect(seen.address).not.toContain('بناء 7');

    const quote = (token: string, businessId: string, priceMin: number) =>
      h.app.inject({ method: 'POST', url: `/api/v1/service-requests/${request.id}/quotes`, headers: auth(token), payload: { businessId, priceMin, priceMax: priceMin + 20_000, etaMinutes: 30 } });
    expect((await quote(providerA, shopA, 60_000)).statusCode).toBe(201);
    expect((await quote(providerB, shopB, 40_000)).statusCode).toBe(201);
    expect((await quote(providerB, shopB, 30_000)).json().error.code).toBe('ALREADY_QUOTED');
    expect((await quote(citizen, shopB, 10_000)).statusCode).toBe(403);

    const mine = (await h.app.inject({ method: 'GET', url: `/api/v1/service-requests/${request.id}`, headers: auth(citizen) })).json<ServiceRequest>();
    expect(mine.quotes).toHaveLength(2);
    // A (non-admin) provider only sees its own quote; competitors' prices stay private.
    const asB = (await h.app.inject({ method: 'GET', url: `/api/v1/service-requests/${request.id}`, headers: auth(providerB) })).json<ServiceRequest>();
    expect(asB.quotes.map((q) => q.businessId)).toEqual([shopB]);

    const quoteB = mine.quotes.find((q) => q.businessId === shopB)!;
    const quoteA = mine.quotes.find((q) => q.businessId === shopA)!;
    const accept = (id: string) => h.app.inject({ method: 'POST', url: `/api/v1/service-requests/${request.id}/quotes/${id}/accept`, headers: auth(citizen) });
    const [first, second] = await Promise.all([accept(quoteB.id), accept(quoteA.id)]);
    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);
    const winnerId = first.statusCode === 200 ? shopB : shopA;
    const winner = winnerId === shopB ? providerB : providerA;
    const loser = winnerId === shopB ? providerA : providerB;

    const assigned = (await h.app.inject({ method: 'GET', url: `/api/v1/service-requests/${request.id}`, headers: auth(winner) })).json<ServiceRequest>();
    expect(assigned).toMatchObject({ status: 'assigned', customerPhone: '+963900000005', address: 'الحي الشمالي، بناء 7، طابق 2' });

    const move = (token: string, status: string, extra: object = {}) =>
      h.app.inject({ method: 'PATCH', url: `/api/v1/service-requests/${request.id}/status`, headers: auth(token), payload: { status, ...extra } });
    expect((await move(loser, 'on_the_way')).statusCode).toBe(403);
    expect((await move(citizen, 'on_the_way')).statusCode).toBe(403);
    expect((await move(winner, 'arrived')).statusCode).toBe(409); // must be on the way first
    expect((await move(winner, 'on_the_way')).statusCode).toBe(200);
    expect((await move(winner, 'arrived')).statusCode).toBe(200);
    const done = await move(winner, 'completed', { finalPrice: 45_000 });
    expect(done.json()).toMatchObject({ status: 'completed', finalPrice: 45_000 });
    expect((await move(citizen, 'cancelled')).statusCode).toBe(409);
  });

  it('keeps unrelated users out', async () => {
    const created = await h.app.inject({
      method: 'POST',
      url: '/api/v1/service-requests',
      headers: auth(citizen),
      payload: { citySlug: 'salamiyah', categoryId: plumbingCategoryId, description: 'تركيب سخان جديد', address: 'وسط المدينة', urgency: 'today' },
    });
    const stranger = await login(h.app, '0922000111');
    expect((await h.app.inject({ method: 'GET', url: `/api/v1/service-requests/${created.json().id}`, headers: auth(stranger) })).statusCode).toBe(403);
  });
});
