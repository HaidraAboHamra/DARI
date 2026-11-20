import type { BusinessSummary, Order, Page, Product } from '@dari/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyFoodUpgrade } from '../src/infrastructure/database/seed/seed-food-apply';
import { SEED_USERS } from '../src/infrastructure/database/seed/seed';
import { auth, createHarness, type Harness, loginAs } from './helpers/harness';

describe('food ordering: options, minimum order, popular items (e2e)', () => {
  let h: Harness;
  let citizen: string;
  let admin: string;
  let food: BusinessSummary[];

  const menuOf = async (b: BusinessSummary) =>
    (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${b.id}/products` })).json<Product[]>();
  const place = (body: object) =>
    h.app.inject({ method: 'POST', url: '/api/v1/orders', headers: auth(citizen), payload: body });
  const byName = (name: string) => food.find((b) => b.name === name)!;

  beforeAll(async () => {
    h = await createHarness();
    [citizen, admin] = await Promise.all([loginAs(h.app, 'citizen'), loginAs(h.app, 'admin')]);
    food = (await h.app.inject({ method: 'GET', url: '/api/v1/businesses?city=salamiyah&vertical=food&limit=50' })).json<Page<BusinessSummary>>().items;
  });
  afterAll(() => h.close());

  it('lists restaurants with ETA, delivery fee and minimum order', () => {
    expect(byName('برغر هاوس')).toMatchObject({ prepMinutes: 20, minOrder: 25000, deliveryFee: 7000, acceptsOrders: true });
    // No own fee → the city default applies.
    expect(byName('مطعم الشام')).toMatchObject({ deliveryFee: 5000, minOrder: 0 });
  });

  it('prices options on the server and snapshots them with the kitchen note', async () => {
    const pizza = (await menuOf(byName('مطعم بيتزا إيطاليا'))).find((p) => p.name === 'بيتزا مارغريتا')!;
    expect(pizza.options.map((g) => g.id)).toEqual(['size', 'extras']);
    const res = await place({
      businessId: pizza.businessId,
      fulfillment: 'pickup',
      items: [
        { productId: pizza.id, quantity: 2, choices: ['size-l', 'x-cheese'], note: 'مقرمشة' },
        { productId: pizza.id, quantity: 1, choices: ['size-m'] },
      ],
    });
    expect(res.statusCode).toBe(201);
    const order = res.json<Order>();
    const large = order.items.find((i) => i.note === 'مقرمشة')!;
    expect(large).toMatchObject({ unitPrice: 32000 + 12000 + 5000, quantity: 2, lineTotal: 98000 });
    expect(large.options).toEqual([{ group: 'الحجم', choice: 'كبير', price: 12000 }, { group: 'إضافات', choice: 'جبنة إضافية', price: 5000 }]);
    expect(order.subtotal).toBe(98000 + 32000);
  });

  it('rejects missing required choices and unknown choice ids', async () => {
    const pizza = (await menuOf(byName('مطعم بيتزا إيطاليا'))).find((p) => p.name === 'بيتزا مارغريتا')!;
    const missing = await place({ businessId: pizza.businessId, fulfillment: 'pickup', items: [{ productId: pizza.id, quantity: 1 }] });
    expect(missing.statusCode).toBe(409);
    expect(missing.json().error).toMatchObject({ code: 'INVALID_OPTIONS', message: 'بيتزا مارغريتا: اختر الحجم' });
    const forged = await place({ businessId: pizza.businessId, fulfillment: 'pickup', items: [{ productId: pizza.id, quantity: 1, choices: ['size-m', 'free-pizza'] }] });
    expect(forged.json().error.code).toBe('INVALID_OPTIONS');
  });

  it('enforces the restaurant minimum order', async () => {
    const burgers = byName('برغر هاوس');
    const fries = (await menuOf(burgers)).find((p) => p.name === 'بطاطا بالجبنة')!;
    const small = await place({ businessId: burgers.id, fulfillment: 'delivery', address: { text: 'وسط المدينة' }, items: [{ productId: fries.id, quantity: 1 }] });
    expect(small.statusCode).toBe(409);
    expect(small.json().error.code).toBe('BELOW_MIN_ORDER');
    const ok = await place({ businessId: burgers.id, fulfillment: 'delivery', address: { text: 'وسط المدينة' }, items: [{ productId: fries.id, quantity: 2 }] });
    expect(ok.statusCode).toBe(201);
    expect(ok.json<Order>()).toMatchObject({ subtotal: 30000, deliveryFee: 7000, total: 37000 });
  });

  it('marks top sellers as popular once they are ordered', async () => {
    const bakery = byName('فرن الضيعة');
    const bread = (await menuOf(bakery)).find((p) => p.name === 'خبز بلدي')!;
    expect(bread.isPopular).toBe(false);
    await place({ businessId: bakery.id, fulfillment: 'pickup', items: [{ productId: bread.id, quantity: 3 }] });
    const after = (await menuOf(bakery)).find((p) => p.name === 'خبز بلدي')!;
    expect(after.isPopular).toBe(true);
    // Merchant-pinned items are popular from day one.
    expect((await menuOf(bakery)).find((p) => p.name === 'منقوشة زعتر')!.isPopular).toBe(true);
  });

  it('keeps unsent fields when a merchant edits one field', async () => {
    const pizzeria = byName('مطعم بيتزا إيطاليا');
    const cola = (await menuOf(pizzeria)).find((p) => p.name === 'كولا')!;
    const res = await h.app.inject({
      method: 'PATCH',
      url: `/api/v1/merchant/businesses/${pizzeria.id}/products/${cola.id}`,
      headers: auth(admin),
      payload: { price: 7000 },
    });
    expect(res.json<Product>()).toMatchObject({ price: 7000, stock: cola.stock, isAvailable: true });
    const margherita = (await menuOf(pizzeria)).find((p) => p.name === 'بيتزا مارغريتا')!;
    const renamed = await h.app.inject({
      method: 'PATCH',
      url: `/api/v1/merchant/businesses/${pizzeria.id}/products/${margherita.id}`,
      headers: auth(admin),
      payload: { description: 'وصفة نابولي' },
    });
    expect(renamed.json<Product>().options).toHaveLength(2);
  });

  it('lists city-wide food offers with their restaurant, and open-now status', async () => {
    const offers = (await h.app.inject({ method: 'GET', url: '/api/v1/offers?city=salamiyah&vertical=food' })).json<{ coupon: { code: string }; business: BusinessSummary }[]>();
    expect(offers.map((o) => o.coupon.code)).toEqual(expect.arrayContaining(['BURGER20', 'SHAM10']));
    expect(offers.find((o) => o.coupon.code === 'BURGER20')!.business.name).toBe('برغر هاوس');
    expect(typeof food[0]!.isOpen).toBe('boolean');
  });

  it('applies the demo food upgrade only once', async () => {
    expect(await applyFoodUpgrade(h.db, SEED_USERS.admin.phone)).toBe(false);
  });
});
