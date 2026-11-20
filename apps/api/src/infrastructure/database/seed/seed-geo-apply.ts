import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../database.module';
import * as s from '../schema';

const VERSION = 'geo-v1';

/** Demo news positions (where each story happens in Salamiyah). */
const NEWS_AT: Record<string, { lat: number; lng: number }> = {
  'افتتاح مشروع جديد في سلمية لدعم الشباب': { lat: 35.0136, lng: 37.0498 },
  'مهرجان سلمية الصيفي يعود هذا الأسبوع': { lat: 35.0113, lng: 37.0532 },
  'بدء موسم قطاف الزيتون في ريف سلمية': { lat: 35.0262, lng: 37.0335 },
  'تحسين خدمات المياه في الأحياء الشرقية': { lat: 35.0121, lng: 37.064 },
};
/** Demo event venues. */
const VENUE_AT: Record<string, { lat: number; lng: number }> = {
  'ساحة المدينة': { lat: 35.0113, lng: 37.0532 },
  'المركز الثقافي': { lat: 35.013, lng: 37.0502 },
  'انطلاق من ساحة سلمية 7:00 صباحاً': { lat: 35.011, lng: 37.0536 },
  'انطلاق من موقف المدينة': { lat: 35.009, lng: 37.056 },
};

/** Demo upgrade «geo v1»: positions for seeded news, events and property listings so they appear on the city map. Runs once. */
export async function applyGeoUpgrade(db: Database): Promise<boolean> {
  const [done] = await db.select().from(s.seedVersions).where(eq(s.seedVersions.name, VERSION));
  if (done) return false;
  await db.transaction(async (tx) => {
    for (const [title, at] of Object.entries(NEWS_AT)) {
      await tx.update(s.articles).set(at).where(and(eq(s.articles.title, title), isNull(s.articles.lat)));
    }
    for (const [venue, at] of Object.entries(VENUE_AT)) {
      await tx.update(s.cityEvents).set(at).where(and(eq(s.cityEvents.venue, venue), isNull(s.cityEvents.lat)));
    }
    // Listings: near their area's centre, spread slightly so pins don't overlap.
    const areaRows = await tx.select().from(s.areas);
    const listings = await tx.select().from(s.propertyListings).where(isNull(s.propertyListings.lat));
    for (const [i, l] of listings.entries()) {
      const area = areaRows.find((a) => a.id === l.areaId);
      if (!area?.lat || !area.lng) continue;
      await tx
        .update(s.propertyListings)
        .set({ lat: area.lat + ((i % 3) - 1) * 0.0016, lng: area.lng + ((i % 2) * 2 - 1) * 0.0014 })
        .where(eq(s.propertyListings.id, l.id));
    }
    await tx.insert(s.seedVersions).values({ name: VERSION });
  });
  return true;
}
