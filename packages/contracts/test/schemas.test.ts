import { describe, expect, it } from 'vitest';
import { createOrderSchema, phoneSchema } from '../src/schemas';

describe('phoneSchema', () => {
  it.each([
    ['0933123456', '+963933123456'],
    ['933123456', '+963933123456'],
    ['00963 933 123 456', '+963933123456'],
    ['963933123456', '+963933123456'],
    ['+49 151 2345678', '+491512345678'],
  ])('normalizes %s', (input, expected) => {
    expect(phoneSchema.parse(input)).toBe(expected);
  });

  it('rejects garbage', () => {
    expect(phoneSchema.safeParse('12ab').success).toBe(false);
  });
});

describe('createOrderSchema', () => {
  const base = {
    businessId: '0190a6d8-0000-7000-8000-000000000001',
    items: [{ productId: '0190a6d8-0000-7000-8000-000000000002', quantity: 2 }],
  };

  it('requires an address for delivery', () => {
    expect(createOrderSchema.safeParse({ ...base, fulfillment: 'delivery' }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, fulfillment: 'pickup' }).success).toBe(true);
  });

  it('rejects duplicated products', () => {
    const dup = { ...base, fulfillment: 'pickup', items: [base.items[0], base.items[0]] };
    expect(createOrderSchema.safeParse(dup).success).toBe(false);
  });
});
