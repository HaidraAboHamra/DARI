import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createHarness, type Harness, loginAs } from './helpers/harness';
import { businessByName } from './helpers/lookup';

describe('catalog import & courier stats (e2e)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  it('imports valid rows, reports invalid ones, and respects plan limits', async () => {
    const merchant = await loginAs(h.app, 'merchant');
    const restaurant = await businessByName(h.app, 'مطعم الشام');
    const url = `/api/v1/merchant/businesses/${restaurant.id}/products/import`;
    const res = await h.app.inject({
      method: 'POST',
      url,
      headers: auth(merchant),
      payload: { rows: [{ name: 'متبل', price: 10000, section: 'مقبلات' }, { name: '', price: -5 }, { name: 'تبولة', price: 12000 }] },
    });
    expect(res.json()).toMatchObject({ created: 2, errors: [{ row: 2 }] });
    const menu = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${restaurant.id}/products` })).json();
    expect(menu.map((p: { name: string }) => p.name)).toEqual(expect.arrayContaining(['متبل', 'تبولة']));

    const tooMany = Array.from({ length: 40 }, (_, i) => ({ name: `صنف ${i}`, price: 1000 }));
    const over = await h.app.inject({ method: 'POST', url, headers: auth(merchant), payload: { rows: tooMany } });
    expect(over.json().error.code).toBe('PLAN_LIMIT');
  });

  it('gives couriers an earnings statement', async () => {
    const courier = await loginAs(h.app, 'courier');
    const stats = (await h.app.inject({ method: 'GET', url: '/api/v1/deliveries/stats?days=7', headers: auth(courier) })).json();
    expect(stats).toMatchObject({ periodDays: 7, delivered: 0, earnings: 0, successRate: null });
    const citizen = await loginAs(h.app, 'citizen');
    expect((await h.app.inject({ method: 'GET', url: '/api/v1/deliveries/stats', headers: auth(citizen) })).statusCode).toBe(403);
  });
});
