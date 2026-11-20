import { describe, expect, it } from 'vitest';
import { defaultChoices, priceLine } from '../src/domain/product-options';
import { lineKey } from '../src/schemas/orders';
import { productOptionsSchema } from '../src/schemas/catalog';

const groups = [
  { id: 'size', name: 'الحجم', min: 1, max: 1, choices: [{ id: 'size-m', name: 'وسط', price: 0 }, { id: 'size-l', name: 'كبير', price: 8000 }] },
  { id: 'extras', name: 'إضافات', min: 0, max: 2, choices: [{ id: 'x-cheese', name: 'جبنة', price: 3000 }, { id: 'x-mush', name: 'فطر', price: 2500 }, { id: 'x-olive', name: 'زيتون', price: 1500 }] },
];

describe('product options', () => {
  it('adds chosen option prices to the base price and snapshots names', () => {
    const r = priceLine(30000, groups, ['size-l', 'x-cheese']);
    expect(r).toEqual({ ok: true, unitPrice: 41000, options: [{ group: 'الحجم', choice: 'كبير', price: 8000 }, { group: 'إضافات', choice: 'جبنة', price: 3000 }] });
  });

  it('enforces required and maximum picks, and rejects unknown ids', () => {
    expect(priceLine(30000, groups, [])).toMatchObject({ ok: false, error: { code: 'TOO_FEW', group: 'الحجم' } });
    expect(priceLine(30000, groups, ['size-m', 'size-l'])).toMatchObject({ ok: false, error: { code: 'TOO_MANY' } });
    expect(priceLine(30000, groups, ['size-m', 'x-cheese', 'x-mush', 'x-olive'])).toMatchObject({ ok: false, error: { code: 'TOO_MANY', max: 2 } });
    expect(priceLine(30000, groups, ['size-m', 'hack'])).toMatchObject({ ok: false, error: { code: 'UNKNOWN_CHOICE' } });
  });

  it('pre-selects the first choice of required groups', () => {
    expect(defaultChoices(groups)).toEqual(['size-m']);
    expect(priceLine(30000, groups, defaultChoices(groups))).toMatchObject({ ok: true, unitPrice: 30000 });
  });

  it('treats the same product with other choices or notes as a separate line', () => {
    expect(lineKey({ productId: 'p', choices: ['b', 'a'] })).toBe(lineKey({ productId: 'p', choices: ['a', 'b'] }));
    expect(lineKey({ productId: 'p', choices: ['a'] })).not.toBe(lineKey({ productId: 'p', choices: ['b'] }));
    expect(lineKey({ productId: 'p', note: 'بدون بصل' })).not.toBe(lineKey({ productId: 'p' }));
  });

  it('validates option group definitions', () => {
    expect(productOptionsSchema.safeParse(groups).success).toBe(true);
    expect(productOptionsSchema.safeParse([{ ...groups[0], min: 2, max: 1 }]).success).toBe(false);
    expect(productOptionsSchema.safeParse([groups[0], { ...groups[1], id: 'size' }]).success).toBe(false);
  });
});

describe('product updates', () => {
  it('changes only the fields that are sent (no defaults reset stock or availability)', async () => {
    const { updateProductSchema, createProductSchema } = await import('../src/schemas/catalog');
    expect(updateProductSchema.parse({ price: 1000 })).toEqual({ price: 1000 });
    expect(createProductSchema.parse({ name: 'x', price: 1000 })).toMatchObject({ isAvailable: true, stock: null, options: [], isFeatured: false });
  });
});
