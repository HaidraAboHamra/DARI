import type { Order, Product } from '@dari/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createHarness, type Harness, login, loginAs } from './helpers/harness';
import { businessByName } from './helpers/lookup';
import { outboxRelay } from './helpers/worker';

describe('marketing, plans & admin (e2e)', () => {
  let h: Harness;
  let citizen: string;
  let merchant: string;
  let admin: string;
  let restaurant: { id: string; slug: string };
  let menu: Product[];

  beforeAll(async () => {
    h = await createHarness();
    [citizen, merchant, admin] = await Promise.all([loginAs(h.app, 'citizen'), loginAs(h.app, 'merchant'), loginAs(h.app, 'admin')]);
    restaurant = await businessByName(h.app, 'مطعم الشام');
    // Items without required options, so tests can order them with a plain quantity.
    menu = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${restaurant.id}/products` }))
      .json<Product[]>()
      .filter((p) => p.options.every((g) => g.min === 0));
  });
  afterAll(() => h.close());

  const coupon = { code: 'save10', title: 'خصم الافتتاح', kind: 'percent', value: 10, maxUses: 1 };
  const createCoupon = () => h.app.inject({ method: 'POST', url: `/api/v1/merchant/businesses/${restaurant.id}/coupons`, headers: auth(merchant), payload: coupon });

  it('gates coupons behind a paid plan and unlocks them after a recorded payment', async () => {
    expect((await createCoupon()).json().error.code).toBe('PLAN_FEATURE');
    const paid = await h.app.inject({
      method: 'POST',
      url: `/api/v1/admin/businesses/${restaurant.id}/payments`,
      headers: auth(admin),
      payload: { plan: 'business', months: 1, amount: 150_000, method: 'cash' },
    });
    expect(paid.statusCode).toBe(201);
    const sub = (await h.app.inject({ method: 'GET', url: `/api/v1/merchant/businesses/${restaurant.id}/subscription`, headers: auth(merchant) })).json();
    expect(sub).toMatchObject({ plan: 'business', effectivePlan: 'business' });
    expect((await h.app.inject({ method: 'POST', url: `/api/v1/admin/businesses/${restaurant.id}/payments`, headers: auth(merchant), payload: { plan: 'pro', months: 1, amount: 1, method: 'cash' } })).statusCode).toBe(403);

    const created = await createCoupon();
    expect(created.json()).toMatchObject({ code: 'SAVE10', usedCount: 0 });
    expect((await createCoupon()).json().error.code).toBe('DUPLICATE_CODE');
    // Public offers now include it (alongside the demo restaurant's own seeded offer).
    const offers = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${restaurant.id}/offers` })).json<{ code: string }[]>();
    expect(offers.map((o) => o.code)).toContain('SAVE10');
  });

  it('applies a coupon at checkout atomically and returns the use on cancellation', async () => {
    const body = { businessId: restaurant.id, fulfillment: 'pickup', items: [{ productId: menu[3]!.id, quantity: 2 }], couponCode: 'save10' };
    const preview = await h.app.inject({ method: 'POST', url: '/api/v1/coupons/preview', headers: auth(citizen), payload: { businessId: restaurant.id, code: 'SAVE10', subtotal: menu[3]!.price * 2 } });
    expect(preview.json().discount).toBe(Math.floor(menu[3]!.price * 2 * 0.1));

    const other = await login(h.app, '0912345678');
    const [a, b] = await Promise.all([
      h.app.inject({ method: 'POST', url: '/api/v1/orders', headers: auth(citizen), payload: body }),
      h.app.inject({ method: 'POST', url: '/api/v1/orders', headers: auth(other), payload: body }),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([201, 409]);
    const order = [a, b].find((r) => r.statusCode === 201)!.json<Order>();
    expect(order.discount).toBe(Math.floor(order.subtotal * 0.1));
    expect(order.total).toBe(order.subtotal - order.discount);
    expect([a, b].find((r) => r.statusCode === 409)!.json().error.code).toBe('COUPON_EXHAUSTED');

    const owner = order.customerId;
    const token = owner === (await h.app.inject({ method: 'GET', url: '/api/v1/me', headers: auth(citizen) })).json().id ? citizen : other;
    await h.app.inject({ method: 'PATCH', url: `/api/v1/orders/${order.id}/status`, headers: auth(token), payload: { status: 'cancelled' } });
    const coupons = (await h.app.inject({ method: 'GET', url: `/api/v1/merchant/businesses/${restaurant.id}/coupons`, headers: auth(merchant) })).json();
    expect(coupons[0].usedCount).toBe(0);
  });

  it('lets citizens opt in, and merchants message only consenting customers (once a day)', async () => {
    expect((await h.app.inject({ method: 'POST', url: `/api/v1/businesses/${restaurant.id}/connect`, headers: auth(citizen) })).statusCode).toBe(204);
    expect((await h.app.inject({ method: 'GET', url: `/api/v1/merchant/businesses/${restaurant.id}/audience`, headers: auth(merchant) })).json()).toEqual({ consented: 1 });

    const send = () =>
      h.app.inject({ method: 'POST', url: `/api/v1/merchant/businesses/${restaurant.id}/broadcasts`, headers: auth(merchant), payload: { title: 'عرض الجمعة', body: 'خصم 10٪ على المشاوي اليوم فقط' } });
    expect((await send()).json()).toEqual({ audience: 1 });
    expect((await send()).json().error.code).toBe('BROADCAST_COOLDOWN');

    await outboxRelay(h.app).drainOnce();
    const inbox = (await h.app.inject({ method: 'GET', url: '/api/v1/me/notifications', headers: auth(citizen) })).json();
    const message = inbox.items.find((n: { type: string }) => n.type === 'broadcast');
    expect(message).toMatchObject({ title: 'مطعم الشام: عرض الجمعة' });
    // Set-based fan-out still produces time-ordered (v7) ids.
    expect(message.id[14]).toBe('7');

    await h.app.inject({ method: 'DELETE', url: `/api/v1/businesses/${restaurant.id}/connect`, headers: auth(citizen) });
    expect((await h.app.inject({ method: 'GET', url: '/api/v1/me/connections', headers: auth(citizen) })).json()).toEqual([]);
  });

  it('saves favorites across entity types', async () => {
    const fav = { entityType: 'business', entityId: restaurant.id };
    await h.app.inject({ method: 'PUT', url: '/api/v1/me/favorites', headers: auth(citizen), payload: fav });
    await h.app.inject({ method: 'PUT', url: '/api/v1/me/favorites', headers: auth(citizen), payload: fav });
    const list = (await h.app.inject({ method: 'GET', url: '/api/v1/me/favorites', headers: auth(citizen) })).json();
    expect(list).toEqual([expect.objectContaining({ title: 'مطعم الشام', href: `/b/${restaurant.slug}` })]);
    await h.app.inject({ method: 'DELETE', url: '/api/v1/me/favorites', headers: auth(citizen), payload: fav });
    expect((await h.app.inject({ method: 'GET', url: '/api/v1/me/favorites', headers: auth(citizen) })).json()).toEqual([]);
  });

  it('puts featured businesses first and manages staff roles', async () => {
    const plumber = await businessByName(h.app, 'أبو سامر للسباكة');
    await h.app.inject({ method: 'PATCH', url: `/api/v1/admin/businesses/${plumber.id}/featured`, headers: auth(admin), payload: { days: 7 } });
    const first = (await h.app.inject({ method: 'GET', url: '/api/v1/businesses?city=salamiyah&limit=1' })).json().items[0];
    expect(first).toMatchObject({ id: plumber.id, isFeatured: true });

    const user = (await h.app.inject({ method: 'GET', url: '/api/v1/admin/users?phone=0900000005', headers: auth(admin) })).json();
    const promoted = await h.app.inject({ method: 'PATCH', url: `/api/v1/admin/users/${user.id}/role`, headers: auth(admin), payload: { role: 'courier' } });
    expect(promoted.json().role).toBe('courier');
    const me = (await h.app.inject({ method: 'GET', url: '/api/v1/me', headers: auth(admin) })).json();
    expect((await h.app.inject({ method: 'PATCH', url: `/api/v1/admin/users/${me.id}/role`, headers: auth(admin), payload: { role: 'citizen' } })).statusCode).toBe(400);
  });
});
