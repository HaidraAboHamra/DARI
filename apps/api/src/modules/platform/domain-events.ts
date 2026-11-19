import type { BookingStatus, OrderStatus, ServiceRequestStatus } from '@dari/contracts';

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
  | { type: 'job.applied'; aggregateId: string; payload: { jobId: string; postedById: string; title: string } }
  | {
      type: 'booking.created';
      aggregateId: string;
      payload: { businessId: string; customerId: string; number: string; resourceName: string; startsAt: string; status: BookingStatus };
    }
  | {
      type: 'booking.status_changed';
      aggregateId: string;
      payload: { businessId: string; customerId: string; number: string; from: BookingStatus; to: BookingStatus };
    }
  | { type: 'service.requested'; aggregateId: string; payload: { cityId: string; categoryId: string; targetBusinessId: string | null; number: string } }
  | { type: 'service.quoted'; aggregateId: string; payload: { customerId: string; businessName: string; number: string } }
  | {
      type: 'service.status_changed';
      aggregateId: string;
      payload: { customerId: string; providerBusinessId: string | null; number: string; to: ServiceRequestStatus };
    }
  | { type: 'ticket.purchased'; aggregateId: string; payload: { eventId: string; organizerId: string; title: string; quantity: number } }
  | { type: 'listing.lead'; aggregateId: string; payload: { listingId: string; ownerId: string; title: string } }
  | { type: 'broadcast.created'; aggregateId: string; payload: { businessId: string; businessName: string; title: string; body: string } };

export type DomainEventType = DomainEvent['type'];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;
