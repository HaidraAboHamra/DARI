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
  'ticket.purchased',
  'listing.viewing_requested',
  'assistant.message',
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export const ENTITY_TYPES = ['business', 'product', 'job', 'news', 'order', 'delivery', 'event', 'listing', 'booking', 'service_request'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

// ── Bookings (blueprint §10) ──────────────────────────────────────────────
export const RESOURCE_KINDS = ['appointment', 'court', 'room', 'venue', 'farm', 'table', 'seat'] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/** `slot` = bookable by time slots within a day; `night` = by nights (hotels, farms, chalets). */
export const BOOKING_UNITS = ['slot', 'night'] as const;
export type BookingUnit = (typeof BOOKING_UNITS)[number];

export const BOOKING_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// ── Provider OS / service requests (blueprint §9) ─────────────────────────
export const SERVICE_URGENCIES = ['now', 'today', 'scheduled'] as const;
export type ServiceUrgency = (typeof SERVICE_URGENCIES)[number];

export const SERVICE_REQUEST_STATUSES = ['open', 'assigned', 'on_the_way', 'arrived', 'completed', 'cancelled'] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

export const QUOTE_STATUSES = ['pending', 'accepted', 'declined', 'withdrawn'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

// ── Events & trips (blueprint §10, §5.9) ──────────────────────────────────
export const EVENT_KINDS = ['event', 'trip'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const TICKET_STATUSES = ['active', 'cancelled', 'checked_in'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// ── Real estate (blueprint §12.2) ─────────────────────────────────────────
export const LISTING_PURPOSES = ['sale', 'rent'] as const;
export type ListingPurpose = (typeof LISTING_PURPOSES)[number];

export const PROPERTY_TYPES = ['apartment', 'house', 'land', 'shop', 'office', 'farm'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const LISTING_STATUSES = ['active', 'sold', 'rented', 'archived'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LEAD_STATUSES = ['new', 'contacted', 'closed'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// ── Marketing & monetization (blueprint §7, §17; financial doc §8) ───────
export const COUPON_KINDS = ['percent', 'amount'] as const;
export type CouponKind = (typeof COUPON_KINDS)[number];

export const PLAN_IDS = ['free', 'starter', 'business', 'pro'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PAYMENT_METHODS = ['cash', 'transfer', 'mobile_wallet'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const FAVORITE_TYPES = ['business', 'listing', 'event'] as const;
export type FavoriteType = (typeof FAVORITE_TYPES)[number];
