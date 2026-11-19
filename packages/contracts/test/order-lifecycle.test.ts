import { describe, expect, it } from 'vitest';
import { canTransition, nextOrderStatuses, TERMINAL_ORDER_STATUSES } from '../src/domain/order-lifecycle';

describe('order lifecycle', () => {
  it('lets only the merchant accept a pending order', () => {
    expect(canTransition('pending', 'accepted', 'merchant', 'delivery')).toBe(true);
    expect(canTransition('pending', 'accepted', 'customer', 'delivery')).toBe(false);
  });

  it('lets the customer cancel only while pending', () => {
    expect(canTransition('pending', 'cancelled', 'customer', 'pickup')).toBe(true);
    expect(canTransition('accepted', 'cancelled', 'customer', 'pickup')).toBe(false);
  });

  it('respects fulfillment-specific transitions', () => {
    expect(nextOrderStatuses('ready', 'merchant', 'pickup')).toEqual(['picked_up', 'cancelled']);
    expect(nextOrderStatuses('ready', 'merchant', 'delivery')).toEqual(['out_for_delivery', 'cancelled']);
  });

  it('has no exits from terminal states', () => {
    for (const s of TERMINAL_ORDER_STATUSES) {
      expect(nextOrderStatuses(s, 'system', 'delivery')).toEqual([]);
    }
    expect([...TERMINAL_ORDER_STATUSES].sort()).toEqual(['cancelled', 'delivered', 'picked_up', 'rejected']);
  });
});
