import type {
  ApplicationStatus,
  BusinessRole,
  BusinessStatus,
  ContentStatus,
  DeliveryStatus,
  DeliveryTaskType,
  EmploymentType,
  FulfillmentType,
  Intent,
  OrderStatus,
  PlatformRole,
  Vertical,
} from './enums';
import type { GeoPoint, Place } from './schemas/common';
import type { OpeningHours } from './schemas/business';

/** Keyset-paginated list. `nextCursor` is null on the last page. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown; requestId?: string };
}

export interface City {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  currency: string;
  timezone: string;
}

export interface Area {
  id: string;
  cityId: string;
  slug: string;
  nameAr: string;
}

export interface Category {
  id: string;
  vertical: Vertical;
  slug: string;
  nameAr: string;
  parentId: string | null;
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  role: PlatformRole;
  cityId: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  user: UserProfile;
}

export interface BusinessSummary {
  id: string;
  slug: string;
  name: string;
  vertical: Vertical;
  categoryName: string | null;
  areaName: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  isVerified: boolean;
  acceptsOrders: boolean;
}

export interface BusinessDetail extends BusinessSummary {
  cityId: string;
  categoryId: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  location: GeoPoint | null;
  openingHours: OpeningHours;
  /** Business-specific delivery fee; null means the city default applies. */
  deliveryFee: number | null;
  status: BusinessStatus;
  createdAt: string;
}

export interface Membership {
  business: BusinessSummary & { status: BusinessStatus };
  role: BusinessRole;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  section: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  stock: number | null;
  sortOrder: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  number: string;
  businessId: string;
  businessName: string;
  customerId: string;
  customerName: string | null;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  address: Place | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryTask {
  id: string;
  type: DeliveryTaskType;
  status: DeliveryStatus;
  orderId: string | null;
  pickup: Place;
  dropoff: Place;
  itemDescription: string | null;
  fee: number;
  courierId: string | null;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  employmentType: EmploymentType;
  salaryMin: number | null;
  salaryMax: number | null;
  businessName: string | null;
  areaName: string | null;
  contactPhone: string | null;
  publishedAt: string;
  expiresAt: string | null;
}

export interface JobApplication {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  createdAt: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string | null;
  coverUrl: string | null;
  status: ContentStatus;
  publishedAt: string | null;
}

export interface Review {
  id: string;
  rating: number;
  quality: number | null;
  commitment: number | null;
  interaction: number | null;
  body: string | null;
  authorName: string | null;
  createdAt: string;
}

export type SearchHit =
  | { kind: 'business'; score: number; item: BusinessSummary }
  | { kind: 'product'; score: number; item: Product & { businessSlug: string; businessName: string } }
  | { kind: 'job'; score: number; item: Job }
  | { kind: 'article'; score: number; item: Article };

export interface SearchResponse {
  searchId: string;
  query: string;
  intent: { intent: Intent; vertical: Vertical | null; confidence: number; urgency: boolean };
  total: number;
  hits: SearchHit[];
}

export interface DemandInsight {
  normalizedQuery: string;
  searches: number;
  zeroResults: number;
  vertical: Vertical | null;
  lastSearchedAt: string;
}

export interface CityKpis {
  activeBusinesses: number;
  searches7d: number;
  zeroResultRate7d: number;
  orders7d: number;
  completedNeeds7d: number;
  gmv7d: number;
}
