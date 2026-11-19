import type { FulfillmentType, OrderStatus } from '../enums';

export type OrderActor = 'customer' | 'merchant' | 'courier' | 'system';

interface Transition {
  readonly to: OrderStatus;
  readonly by: readonly OrderActor[];
  /** Restricts the transition to one fulfillment type. */
  readonly only?: FulfillmentType;
}

/**
 * The single source of truth for the order state machine.
 * Every status change in the system must pass through {@link canTransition}.
 */
const TRANSITIONS: Readonly<Record<OrderStatus, readonly Transition[]>> = {
  pending: [
    { to: 'accepted', by: ['merchant'] },
    { to: 'rejected', by: ['merchant'] },
    { to: 'cancelled', by: ['customer', 'system'] },
  ],
  accepted: [
    { to: 'preparing', by: ['merchant'] },
    { to: 'cancelled', by: ['merchant', 'system'] },
  ],
  preparing: [
    { to: 'ready', by: ['merchant'] },
    { to: 'cancelled', by: ['merchant', 'system'] },
  ],
  ready: [
    { to: 'out_for_delivery', by: ['merchant', 'courier'], only: 'delivery' },
    { to: 'picked_up', by: ['merchant'], only: 'pickup' },
    { to: 'cancelled', by: ['merchant', 'system'] },
  ],
  out_for_delivery: [
    { to: 'delivered', by: ['merchant', 'courier'] },
    { to: 'cancelled', by: ['system'] },
  ],
  delivered: [],
  picked_up: [],
  rejected: [],
  cancelled: [],
};

export const TERMINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set(
  (Object.keys(TRANSITIONS) as OrderStatus[]).filter((s) => TRANSITIONS[s].length === 0),
);

export function nextOrderStatuses(
  from: OrderStatus,
  actor: OrderActor,
  fulfillment: FulfillmentType,
): OrderStatus[] {
  return TRANSITIONS[from]
    .filter((t) => t.by.includes(actor) && (!t.only || t.only === fulfillment))
    .map((t) => t.to);
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActor,
  fulfillment: FulfillmentType,
): boolean {
  return nextOrderStatuses(from, actor, fulfillment).includes(to);
}
