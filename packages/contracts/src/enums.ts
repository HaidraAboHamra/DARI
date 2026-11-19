/**
 * Domain vocabulary shared by every Dari application.
 * Values are persisted in the database, so they are append-only:
 * never rename or remove a value, add a new one instead.
 */

export const VERTICALS = [
  'food',
  'shopping',
  'services',
  'health',
  'appointments',
  'jobs',
  'news',
  'events',
  'property',
  'trips',
  'stays',
] as const;
export type Vertical = (typeof VERTICALS)[number];

export const BUSINESS_STATUSES = ['draft', 'pending_review', 'active', 'suspended'] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

/** RBAC roles inside a business (blueprint §16.2). Ordered from most to least privileged. */
export const BUSINESS_ROLES = [
  'owner',
  'manager',
  'cashier',
  'warehouse',
  'delivery',
  'marketing',
  'accountant',
  'viewer',
] as const;
export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export const PLATFORM_ROLES = ['citizen', 'courier', 'editor', 'admin'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'picked_up',
  'rejected',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FULFILLMENT_TYPES = ['pickup', 'delivery'] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

/** Delivery engine task patterns (blueprint §6.1). */
export const DELIVERY_TASK_TYPES = [
  'merchant_to_citizen',
  'store_to_citizen',
  'citizen_to_citizen',
  'shop_to_shop',
  'buy_for_me',
  'document',
  'event_logistics',
] as const;
export type DeliveryTaskType = (typeof DELIVERY_TASK_TYPES)[number];

export const DELIVERY_STATUSES = [
  'requested',
  'assigned',
  'picked_up',
  'delivered',
  'cancelled',
  'failed',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'seasonal',
  'remote',
  'internship',
  'freelance',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const JOB_STATUSES = ['open', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const APPLICATION_STATUSES = ['submitted', 'shortlisted', 'rejected', 'hired'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const CONTENT_STATUSES = ['draft', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** User intent taxonomy (blueprint §4.1). */
export const INTENTS = [
  'discover',
  'find',
  'urgent',
  'buy',
  'book',
  'attend',
  'travel',
  'apply',
  'property',
  'stay',
  'service',
  'information',
] as const;
export type Intent = (typeof INTENTS)[number];

/** Canonical product analytics events (blueprint §13.2). */
export const ANALYTICS_EVENTS = [
  'search.created',
  'search.result_clicked',
  'entity.viewed',
  'product.viewed',
  'menu.opened',
  'save.created',
  'share.clicked',
  'call.clicked',
  'whatsapp.clicked',
  'map.opened',
  'cart.created',
  'checkout.started',
  'order.created',
  'booking.created',
  'service.requested',
  'review.created',
  'job.applied',
  'delivery.requested',
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export const ENTITY_TYPES = ['business', 'product', 'job', 'news', 'order', 'delivery'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
