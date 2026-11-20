import type { GeoPoint } from '../schemas/common';

/** City delivery pricing, set by admins (fees in the city currency). */
export interface DeliveryPricing {
  /** Fee for the first kilometre (pickup + handover). */
  baseFee: number;
  /** Added per kilometre beyond the first. */
  perKm: number;
  /** Never charge less than this. */
  minFee: number;
  /** Orders farther than this (road km) are not delivered. */
  maxKm: number;
  /** Fees are rounded up to this step (e.g. 500 SYP). */
  roundTo: number;
}

export interface DeliveryQuote {
  /** Estimated road distance in km (straight line × ROAD_FACTOR), one decimal. */
  distanceKm: number;
  fee: number;
  deliverable: boolean;
  maxKm: number;
}

/** Streets are rarely straight: road distance ≈ 1.3 × straight-line distance in a small city grid. */
export const ROAD_FACTOR = 1.3;

/** Defaults for a city that has only a flat base fee configured. */
export function defaultPricing(baseFee: number): DeliveryPricing {
  return { baseFee, perKm: 1500, minFee: baseFee, maxKm: 15, roundTo: 500 };
}

/** Great-circle distance in km (haversine). */
export function straightKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Prices a delivery between two points. Shared by the API (authoritative) and the apps (preview). */
export function quoteDelivery(pricing: DeliveryPricing, from: GeoPoint, to: GeoPoint): DeliveryQuote {
  const km = Math.round(straightKm(from, to) * ROAD_FACTOR * 10) / 10;
  const raw = pricing.baseFee + Math.max(0, km - 1) * pricing.perKm;
  const step = Math.max(1, pricing.roundTo);
  const fee = Math.max(pricing.minFee, Math.ceil(raw / step) * step);
  return { distanceKm: km, fee, deliverable: km <= pricing.maxKm, maxKm: pricing.maxKm };
}

/**
 * A business's delivery offer to a customer: its own flat fee if the merchant set one,
 * otherwise distance pricing when both locations are known, otherwise the base fee.
 */
export function businessQuote(
  business: { ownDeliveryFee: number | null; location: GeoPoint | null },
  pricing: DeliveryPricing,
  customer?: GeoPoint | null,
): { fee: number; distanceKm: number | null; deliverable: boolean } {
  const distance = business.location && customer ? quoteDelivery(pricing, business.location, customer) : null;
  return {
    fee: business.ownDeliveryFee ?? distance?.fee ?? pricing.baseFee,
    distanceKm: distance?.distanceKm ?? null,
    deliverable: distance?.deliverable ?? true,
  };
}
