import type { BusinessSummary, DeliveryPricing, DeliveryQuote, Order, Page, Product } from '@dari/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createHarness, type Harness, loginAs } from './helpers/harness';

/** ~1 km north-east of the centre, and a point ~25 km away. */
const NEAR = { lat: 35.0185, lng: 37.0602 };
const FAR = { lat: 35.2, lng: 37.2 };

describe('distance-based delivery pricing (e2e)', () => {
  let h: Harness;
  let admin: string;
  let citizen: string;
  let food: BusinessSummary[];
  const sham = () => food.find((b) => b.name === 'مطعم الشام')!;
  const pricing: DeliveryPricing = { baseFee: 4000, perKm: 2000, minFee: 4000, maxKm: 6, roundTo: 500 };

  beforeAll(async () => {
    h = await createHarness();
    [admin, citizen] = await Promise.all([loginAs(h.app, 'admin'), loginAs(h.app, 'citizen')]);
  });
  afterAll(() => h.close());

  it('lets only admins set the city pricing, and publishes it', async () => {
    const url = '/api/v1/admin/cities/salamiyah/delivery-pricing';
    expect((await h.app.inject({ method: 'PUT', url, headers: auth(citizen), payload: pricing })).statusCode).toBe(403);
    expect((await h.app.inject({ method: 'PUT', url, headers: auth(admin), payload: { ...pricing, roundTo: 0 } })).statusCode).toBe(400);
    expect((await h.app.inject({ method: 'PUT', url, headers: auth(admin), payload: pricing })).json()).toEqual(pricing);
    expect((await h.app.inject({ method: 'GET', url: '/api/v1/cities/salamiyah/delivery-pricing' })).json()).toEqual(pricing);
  });

  it('prices each restaurant by distance to the customer (own flat fees win)', async () => {
    const res = await h.app.inject({ method: 'GET', url: `/api/v1/businesses?city=salamiyah&vertical=food&limit=50&lat=${NEAR.lat}&lng=${NEAR.lng}` });
    food = res.json<Page<BusinessSummary>>().items;
    expect(sham().distanceKm).toBeGreaterThan(0);
    expect(sham().deliveryFee).toBeGreaterThanOrEqual(pricing.minFee);
    expect(sham().deliveryFee % pricing.roundTo).toBe(0);
    expect(food.find((b) => b.name === 'برغر هاوس')!.deliveryFee).toBe(7000); // merchant's own fee
    // Without a location: the base fee, no distance.
    const plain = (await h.app.inject({ method: 'GET', url: '/api/v1/businesses?city=salamiyah&vertical=food&limit=50' })).json<Page<BusinessSummary>>().items;
    expect(plain.find((b) => b.name === 'مطعم الشام')).toMatchObject({ deliveryFee: 4000, distanceKm: null, deliverable: true });
  });

  it('quotes a precise point and flags addresses beyond the radius', async () => {
    const near = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${sham().id}/delivery-quote?lat=${NEAR.lat}&lng=${NEAR.lng}` })).json<DeliveryQuote>();
    expect(near).toMatchObject({ fee: sham().deliveryFee, deliverable: true, maxKm: 6 });
    const far = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${sham().id}/delivery-quote?lat=${FAR.lat}&lng=${FAR.lng}` })).json<DeliveryQuote>();
    expect(far.deliverable).toBe(false);
  });

  it('charges the quoted fee at checkout and refuses out-of-range addresses', async () => {
    const menu = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${sham().id}/products` })).json<Product[]>();
    const hummus = menu.find((p) => p.name === 'حمص بطحينة')!;
    const order = (location: { lat: number; lng: number }) =>
      h.app.inject({
        method: 'POST',
        url: '/api/v1/orders',
        headers: auth(citizen),
        payload: { businessId: sham().id, fulfillment: 'delivery', address: { text: 'الحي الشرقي', location }, items: [{ productId: hummus.id, quantity: 1 }] },
      });
    const ok = await order(NEAR);
    expect(ok.statusCode).toBe(201);
    expect(ok.json<Order>().deliveryFee).toBe(sham().deliveryFee);
    const far = await order(FAR);
    expect(far.statusCode).toBe(409);
    expect(far.json().error.code).toBe('OUT_OF_RANGE');
  });

  it('prices «توصيل أي شي» by the distance between the two pins', async () => {
    const res = await h.app.inject({
      method: 'POST',
      url: '/api/v1/deliveries',
      headers: auth(citizen),
      payload: { citySlug: 'salamiyah', type: 'citizen_to_citizen', pickup: { text: 'وسط المدينة', location: { lat: 35.0113, lng: 37.0532 } }, dropoff: { text: 'الحي الشرقي', location: NEAR }, itemDescription: 'مفتاح' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().fee).toBeGreaterThan(pricing.baseFee);
  });
});
