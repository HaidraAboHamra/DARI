import type { OrderStatus } from '@dari/contracts';

/**
 * Every domain event the system emits. Adding an event here makes the
 * TypeScript compiler require a handler decision in the outbox relay.
 */
export type DomainEvent =
  | { type: 'order.created'; aggregateId: string; payload: { businessId: string; customerId: string; total: number; number: string } }
  | {
      type: 'order.status_changed';
      aggregateId: string;
      payload: { businessId: string; customerId: string; number: string; from: OrderStatus; to: OrderStatus };
    }
  | { type: 'delivery.requested'; aggregateId: string; payload: { cityId: string; requesterId: string } }
  | { type: 'business.submitted'; aggregateId: string; payload: { cityId: string; name: string } }
  | { type: 'business.approved'; aggregateId: string; payload: { ownerIds: string[]; name: string } }
  | { type: 'job.applied'; aggregateId: string; payload: { jobId: string; postedById: string; title: string } };

export type DomainEventType = DomainEvent['type'];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;
