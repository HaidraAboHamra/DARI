import type { BusinessSummary, Order, Page, Product } from '@dari/contracts';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { users } from '../src/infrastructure/database/schema';
import { auth, createHarness, type Harness, login, loginAs } from './helpers/harness';
import { outboxRelay } from './helpers/worker';

describe('commerce (e2e)', () => {
  let h: Harness;
  let citizen: string;
  let merchant: string;
  let admin: string;
  let courier: string;
  let restaurant: BusinessSummary;
  let pizzeria: BusinessSummary;
  let menu: Product[];

  beforeAll(async () => {
    h = await createHarness();
    [citizen, merchant, admin, courier] = await Promise.all([
      loginAs(h.app, 'citizen'),
      loginAs(h.app, 'merchant'),
      loginAs(h.app, 'admin'),
      loginAs(h.app, 'courier'),
    ]);
    const list = await h.app.inject({ method: 'GET', url: '/api/v1/businesses?city=salamiyah&vertical=food&limit=50' });
    const items = list.json<Page<BusinessSummary>>().items;
    restaurant = items.find((b) => b.name === 'مطعم الشام')!;
    pizzeria = items.find((b) => b.name === 'مطعم بيتزا إيطاليا')!;
    menu = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${restaurant.id}/products` })).json();
  });
  afterAll(() => h.close());

  const placeOrder = (token: string, body: object, key?: string) =>
    h.app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { ...auth(token), ...(key && { 'idempotency-key': key }) },
      payload: body,
    });

  const setStatus = (token: string, orderId: string, status: string) =>
    h.app.inject({ method: 'PATCH', url: `/api/v1/orders/${orderId}/status`, headers: auth(token), payload: { status } });

  it('paginates the directory with keyset cursors without duplicates', async () => {
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const res = await h.app.inject({
        method: 'GET',
        url: `/api/v1/businesses?city=salamiyah&limit=3${cursor ? `&cursor=${cursor}` : ''}`,
      });
      const page = res.json<Page<BusinessSummary>>();
      page.items.forEach((b) => {
        expect(seen.has(b.id)).toBe(false);
        seen.add(b.id);
      });
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen.size).toBe(20);
  });

  it('runs a delivery order end to end: merchant, courier, CRM, notifications', async () => {
    const res = await placeOrder(citizen, {
      businessId: restaurant.id,
      fulfillment: 'delivery',
      items: [{ productId: menu[0]!.id, quantity: 2 }],
      address: { text: 'الحي الشمالي، بناء 4' },
    });
    expect(res.statusCode).toBe(201);
    const order = res.json<Order>();
    expect(order).toMatchObject({ status: 'pending', subtotal: menu[0]!.price * 2, deliveryFee: 5000 });
    expect(order.total).toBe(order.subtotal + 5000);
    expect(order.number).toMatch(/^D-[0-9A-Z]{8}$/);

    // Customers cannot act as merchants.
    expect((await setStatus(citizen, order.id, 'accepted')).statusCode).toBe(403);
    expect((await setStatus(merchant, order.id, 'accepted')).json().status).toBe('accepted');

    // Outbox: new-order notification for the merchant + courier task for the accepted order.
    const relay = outboxRelay(h.app);
    expect(await relay.drainOnce()).toBeGreaterThanOrEqual(2);
    const inbox = await h.app.inject({ method: 'GET', url: '/api/v1/me/notifications', headers: auth(merchant) });
    expect(inbox.json().items.map((n: { title: string }) => n.title)).toContain(`طلب جديد ${order.number}`);

    const board = await h.app.inject({ method: 'GET', url: '/api/v1/deliveries/board?city=salamiyah', headers: auth(courier) });
    const task = board.json().items.find((t: { orderId: string }) => t.orderId === order.id);
    expect(task).toMatchObject({ type: 'merchant_to_citizen', status: 'requested', fee: 5000 });

    // Two couriers race for the task: exactly one wins.
    await login(h.app, '0966000123');
    await h.db.update(users).set({ role: 'courier' }).where(eq(users.phone, '+963966000123'));
    const courier2Token = await login(h.app, '0966000123'); // new token carries the courier role
    const claims = await Promise.all([
      h.app.inject({ method: 'POST', url: `/api/v1/deliveries/${task.id}/claim`, headers: auth(courier) }),
      h.app.inject({ method: 'POST', url: `/api/v1/deliveries/${task.id}/claim`, headers: auth(courier2Token) }),
    ]);
    expect(claims.map((c) => c.statusCode).sort()).toEqual([200, 409]);
    const winner = claims[0]!.statusCode === 200 ? courier : courier2Token;

    expect((await setStatus(merchant, order.id, 'preparing')).statusCode).toBe(200);
    expect((await setStatus(merchant, order.id, 'ready')).statusCode).toBe(200);
    const pick = (status: string) =>
      h.app.inject({ method: 'PATCH', url: `/api/v1/deliveries/${task.id}/status`, headers: auth(winner), payload: { status } });
    expect((await pick('delivered')).statusCode).toBe(409); // must pick up first
    expect((await pick('picked_up')).statusCode).toBe(200);
    expect((await pick('delivered')).statusCode).toBe(200);

    const final = await h.app.inject({ method: 'GET', url: `/api/v1/orders/${order.id}`, headers: auth(citizen) });
    expect(final.json().status).toBe('delivered');

    const customers = await h.app.inject({ method: 'GET', url: `/api/v1/merchant/businesses/${restaurant.id}/customers`, headers: auth(merchant) });
    expect(customers.json().items[0]).toMatchObject({ name: 'أحمد محمد', ordersCount: 1, totalSpent: order.total, segment: 'new' });

    const insights = await h.app.inject({ method: 'GET', url: `/api/v1/merchant/businesses/${restaurant.id}/insights`, headers: auth(merchant) });
    expect(insights.json()).toMatchObject({ completedOrders: 1, revenue: order.total });
  });

  it('is idempotent for retried checkouts', async () => {
    const body = { businessId: restaurant.id, fulfillment: 'pickup', items: [{ productId: menu[1]!.id, quantity: 1 }] };
    const [a, b] = await Promise.all([placeOrder(citizen, body, 'retry-key-123'), placeOrder(citizen, body, 'retry-key-123')]);
    expect(a.json().id).toBe(b.json().id);
    const third = await placeOrder(citizen, body, 'retry-key-123');
    expect(third.json().id).toBe(a.json().id);
  });

  it('never oversells tracked stock and releases it on cancellation', async () => {
    const pizzaMenu: Product[] = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${pizzeria.id}/products` })).json();
    const cola = pizzaMenu.find((p) => p.name === 'كولا')!;
    const patch = await h.app.inject({
      method: 'PATCH',
      url: `/api/v1/merchant/businesses/${pizzeria.id}/products/${cola.id}`,
      headers: auth(admin),
      payload: { stock: 3 },
    });
    expect(patch.json().stock).toBe(3);

    const body = { businessId: pizzeria.id, fulfillment: 'pickup', items: [{ productId: cola.id, quantity: 2 }] };
    const results = await Promise.all([placeOrder(citizen, body), placeOrder(citizen, body)]);
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes).toEqual([201, 409]);
    const rejected = results.find((r) => r.statusCode === 409)!;
    expect(rejected.json().error).toMatchObject({ code: 'OUT_OF_STOCK', details: { available: 1 } });

    const placed = results.find((r) => r.statusCode === 201)!.json<Order>();
    expect((await setStatus(citizen, placed.id, 'cancelled')).json().status).toBe('cancelled');
    const after: Product[] = (await h.app.inject({ method: 'GET', url: `/api/v1/merchant/businesses/${pizzeria.id}/products`, headers: auth(admin) })).json();
    expect(after.find((p) => p.id === cola.id)!.stock).toBe(3);
  });

  it('rejects invalid transitions and cross-business access', async () => {
    const order = (await placeOrder(citizen, { businessId: restaurant.id, fulfillment: 'pickup', items: [{ productId: menu[0]!.id, quantity: 1 }] })).json<Order>();
    const skip = await setStatus(merchant, order.id, 'picked_up');
    expect(skip.statusCode).toBe(409);
    expect(skip.json().error.code).toBe('INVALID_TRANSITION');

    // The merchant does not belong to the pizzeria.
    const foreign = await h.app.inject({ method: 'GET', url: `/api/v1/merchant/businesses/${pizzeria.id}/orders`, headers: auth(merchant) });
    expect(foreign.statusCode).toBe(403);
  });

  it('enforces role permissions inside a business (RBAC)', async () => {
    const add = await h.app.inject({
      method: 'POST',
      url: `/api/v1/merchant/businesses/${restaurant.id}/members`,
      headers: auth(merchant),
      payload: { phone: '0977000555', role: 'cashier' },
    });
    expect(add.statusCode).toBe(204);
    const cashier = await login(h.app, '0977000555');

    const order = (await placeOrder(citizen, { businessId: restaurant.id, fulfillment: 'pickup', items: [{ productId: menu[0]!.id, quantity: 1 }] })).json<Order>();
    expect((await setStatus(cashier, order.id, 'accepted')).statusCode).toBe(200);

    const createProduct = await h.app.inject({
      method: 'POST',
      url: `/api/v1/merchant/businesses/${restaurant.id}/products`,
      headers: auth(cashier),
      payload: { name: 'منتج', price: 1000 },
    });
    expect(createProduct.statusCode).toBe(403);

    const promote = await h.app.inject({
      method: 'POST',
      url: `/api/v1/merchant/businesses/${restaurant.id}/members`,
      headers: auth(cashier),
      payload: { phone: '0977000556', role: 'manager' },
    });
    expect(promote.statusCode).toBe(403);
  });

  it('validates input with field-level errors', async () => {
    const res = await placeOrder(citizen, { businessId: restaurant.id, fulfillment: 'delivery', items: [] });
    expect(res.statusCode).toBe(400);
    const paths = res.json().error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['items']));
  });
});
