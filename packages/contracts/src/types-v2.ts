import type {
  BookingStatus,
  BookingUnit,
  CouponKind,
  EventKind,
  LeadStatus,
  ListingPurpose,
  ListingStatus,
  PlanId,
  PropertyType,
  QuoteStatus,
  ResourceKind,
  ServiceRequestStatus,
  ServiceUrgency,
  TicketStatus,
  Vertical,
} from './enums';
import type { OpeningHours } from './schemas/business';
import type { GeoPoint } from './schemas/common';
import type { BusinessSummary, SearchHit } from './types';

export interface BookableResource {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  kind: ResourceKind;
  unit: BookingUnit;
  slotMinutes: number;
  capacity: number;
  price: number;
  weeklyHours: OpeningHours;
  autoConfirm: boolean;
  isActive: boolean;
}

export interface Booking {
  id: string;
  number: string;
  businessId: string;
  businessName: string;
  resourceId: string;
  resourceName: string;
  unit: BookingUnit;
  customerId: string;
  customerName: string | null;
  startsAt: string;
  endsAt: string;
  partySize: number;
  status: BookingStatus;
  total: number;
  notes: string | null;
  createdAt: string;
}

export interface ServiceQuote {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  ratingAvg: number;
  priceMin: number;
  priceMax: number;
  etaMinutes: number;
  message: string | null;
  status: QuoteStatus;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  number: string;
  categoryId: string;
  categoryName: string;
  customerId: string;
  customerName: string | null;
  /** Revealed to the assigned provider only. */
  customerPhone: string | null;
  description: string;
  address: string;
  areaName: string | null;
  urgency: ServiceUrgency;
  preferredAt: string | null;
  status: ServiceRequestStatus;
  provider: { id: string; name: string; slug: string; phone: string | null } | null;
  finalPrice: number | null;
  quotes: ServiceQuote[];
  createdAt: string;
}

export interface CityEvent {
  id: string;
  kind: EventKind;
  title: string;
  description: string;
  venue: string;
  destination: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  seatsLeft: number;
  price: number;
  coverUrl: string | null;
  organizerName: string | null;
  businessId: string | null;
  organizerId: string;
}

export interface Ticket {
  id: string;
  code: string;
  eventId: string;
  eventTitle: string;
  startsAt: string;
  venue: string;
  quantity: number;
  total: number;
  status: TicketStatus;
  checkedInAt: string | null;
}

export interface PropertyListing {
  id: string;
  purpose: ListingPurpose;
  propertyType: PropertyType;
  title: string;
  description: string;
  price: number;
  areaName: string | null;
  rooms: number | null;
  sizeSqm: number | null;
  address: string | null;
  location: GeoPoint | null;
  images: string[];
  status: ListingStatus;
  isFeatured: boolean;
  ownerId: string;
  officeName: string | null;
  createdAt: string;
}

export interface ViewingLead {
  id: string;
  listingId: string;
  listingTitle: string;
  name: string | null;
  phone: string;
  message: string | null;
  preferredTime: string | null;
  status: LeadStatus;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  kind: CouponKind;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isPublic: boolean;
  isActive: boolean;
}

export interface Favorite {
  entityType: 'business' | 'listing' | 'event';
  entityId: string;
  title: string;
  href: string;
  vertical: Vertical | null;
  createdAt: string;
}

export interface Connection {
  business: BusinessSummary;
  consentedAt: string;
}

export interface Subscription {
  plan: PlanId;
  effectivePlan: PlanId;
  expiresAt: string | null;
  usage: { products: number; members: number; resources: number };
}

export interface MapPoint {
  id: string;
  slug: string;
  name: string;
  vertical: Vertical;
  lat: number;
  lng: number;
}

export interface MediaUpload {
  id: string;
  url: string;
  contentType: string;
  size: number;
}

export interface AssistantAction {
  label: string;
  href: string;
}

export interface AssistantReply {
  reply: string;
  intent: string;
  hits: SearchHit[];
  actions: AssistantAction[];
  /** "llm" when a language model wrote the reply, "rules" otherwise. */
  engine: 'llm' | 'rules';
}

export interface SmartInsight {
  kind: 'low_stock' | 'slow_product' | 'cancellations' | 'at_risk_customers' | 'pending_bookings' | 'no_catalog';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
}
