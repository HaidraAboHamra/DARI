import { describe, expect, it } from 'vitest';
import { addToCart, cartCount, cartItems, cartSubtotal, choicesFromSnapshot, makeLine, migrateCart, setLineQuantity } from '../src/domain/cart';

const pizza = {
  id: 'p1',
  name: 'مارغريتا',
  price: 30000,
  imageUrl: null,
  options: [
    { id: 'size', name: 'الحجم', min: 1, max: 1, choices: [{ id: 'size-m', name: 'وسط', price: 0 }, { id: 'size-l', name: 'كبير', price: 10000 }] },
    { id: 'extras', name: 'إضافات', min: 0, max: 2, choices: [{ id: 'x-cheese', name: 'جبنة', price: 3000 }] },
  ],
};
const shop = { businessId: 'b1', businessName: 'إيطاليا', businessSlug: 'italia' };

describe('cart', () => {
  it('merges identical lines and keeps different choices or notes apart', () => {
    let { cart } = addToCart(null, shop, makeLine(pizza, ['size-l', 'x-cheese']));
    cart = addToCart(cart, shop, makeLine(pizza, ['x-cheese', 'size-l'])).cart;
    cart = addToCart(cart, shop, makeLine(pizza, ['size-m'])).cart;
    cart = addToCart(cart, shop, makeLine(pizza, ['size-m'], 'بدون زيتون')).cart;
    expect(cart.lines.map((l) => [l.optionsLabel, l.quantity, l.price])).toEqual([
      ['كبير · جبنة', 2, 43000],
      ['وسط', 1, 30000],
      ['وسط', 1, 30000],
    ]);
    expect(cartCount(cart)).toBe(4);
    expect(cartSubtotal(cart)).toBe(43000 * 2 + 30000 * 2);
    expect(cartItems(cart)[0]).toEqual({ productId: 'p1', quantity: 2, choices: ['size-l', 'x-cheese'] });
    expect(cartItems(cart)[2]).toMatchObject({ note: 'بدون زيتون' });
  });

  it('starts a new cart for another merchant and empties when the last line goes', () => {
    const first = addToCart(null, shop, makeLine(pizza, ['size-m'])).cart;
    const other = addToCart(first, { ...shop, businessId: 'b2' }, makeLine(pizza, ['size-m']));
    expect(other.replaced).toBe(true);
    expect(setLineQuantity(first, first.lines[0]!.key, 0)).toBeNull();
  });

  it('maps past option snapshots back to choice ids for reordering', () => {
    expect(choicesFromSnapshot(pizza, [{ group: 'الحجم', choice: 'كبير', price: 10000 }])).toEqual(['size-l']);
    expect(choicesFromSnapshot(pizza, [{ group: 'الحجم', choice: 'عائلي', price: 0 }])).toBeNull();
  });

  it('upgrades carts saved by older app versions', () => {
    const old = { ...shop, lines: [{ productId: 'p9', name: 'حمص', price: 12000, quantity: 2 }] };
    expect(migrateCart(old)!.lines[0]).toMatchObject({ key: 'p9||', choices: [], optionsLabel: '' });
    expect(migrateCart(null)).toBeNull();
  });
});
