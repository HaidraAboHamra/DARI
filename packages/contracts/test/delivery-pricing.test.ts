import { describe, expect, it } from 'vitest';
import { defaultPricing, quoteDelivery, straightKm } from '../src/domain/delivery-pricing';
import { deliveryPricingSchema } from '../src/schemas/common';

const center = { lat: 35.0113, lng: 37.0532 };
const pricing = { baseFee: 5000, perKm: 1500, minFee: 5000, maxKm: 8, roundTo: 500 };

describe('delivery pricing', () => {
  it('measures distance with the haversine formula', () => {
    // ~1.02 km between the centre and the north district of Salamiyah
    expect(straightKm(center, { lat: 35.0205, lng: 37.0521 })).toBeCloseTo(1.03, 1);
  });

  it('charges the base fee for the first km, then per km, rounded up', () => {
    expect(quoteDelivery(pricing, center, center)).toEqual({ distanceKm: 0, fee: 5000, deliverable: true, maxKm: 8 });
    const q = quoteDelivery(pricing, center, { lat: 35.0205, lng: 37.0521 }); // ~1.3 road km
    expect(q.distanceKm).toBeCloseTo(1.3, 1);
    expect(q.fee).toBe(5500); // 5000 + 0.3×1500 = 5450 → 5500
  });

  it('respects the minimum fee and the delivery radius', () => {
    expect(quoteDelivery({ ...pricing, baseFee: 1000, minFee: 4000 }, center, center).fee).toBe(4000);
    const far = quoteDelivery(pricing, center, { lat: 35.1, lng: 37.1 });
    expect(far.deliverable).toBe(false);
  });

  it('derives sane defaults from a flat city fee and validates admin input', () => {
    expect(defaultPricing(5000)).toMatchObject({ baseFee: 5000, minFee: 5000, roundTo: 500 });
    expect(deliveryPricingSchema.safeParse({ ...pricing, roundTo: 0 }).success).toBe(false);
  });
});
