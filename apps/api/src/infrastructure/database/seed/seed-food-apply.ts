import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { productOptionsSchema, slugify } from '@dari/contracts';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { buildSearchText } from '../../../modules/directory/search-text';
import type { ObjectStorage } from '../../storage/object-storage';
import type { Database } from '../database.module';
import * as s from '../schema';
import { FOOD_CATEGORIES, FOOD_PLACES } from './seed-food';
import { SALAMIYAH } from './seed-data';

const VERSION = 'food-v2';
/** `apps/api/seed-media/food` — same relative depth from src/ and dist/. */
const MEDIA_DIR = path.resolve(__dirname, '../../../../seed-media/food');
/** Earlier demo items replaced by the v2 menus. */
const RETIRED = ['كنافة نابلسية - كغ', 'معمول تمر - كغ', 'بلورية - كغ'];

/** Stable storage key per photo, in the same `yyyy/mm/<uuid>.ext` shape as uploads. */
function mediaKey(name: string): string {
  const h = createHash('sha256').update(`dari-seed:${name}`).digest('hex');
  return `2026/01/${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}.webp`;
}

async function publishPhotos(storage: ObjectStorage): Promise<Map<string, string>> {
  const names = new Set(FOOD_PLACES.flatMap((p) => [p.cover, p.logo, ...p.items.flatMap((i) => (i.photo ? [i.photo] : []))]));
  const urls = new Map<string, string>();
  for (const name of names) {
    const key = mediaKey(name);
    const bytes = await readFile(path.join(MEDIA_DIR, `${name}.webp`));
    await storage.put(key, bytes, 'image/webp').catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'EEXIST') throw err; // already published by an earlier run
    });
    urls.set(name, storage.publicUrl(key));
  }
  return urls;
}

/**
 * Demo upgrade «food v2»: restaurant photos/logos, prep times, minimum orders,
 * and full menus with photos and options. Runs once per database (tracked in
 * `seed_versions`), so servers seeded earlier get it on their next deploy.
 * Without storage (tests) menus are applied without images.
 */
export async function applyFoodUpgrade(db: Database, ownerPhone: string, storage?: ObjectStorage): Promise<boolean> {
  const [done] = await db.select().from(s.seedVersions).where(eq(s.seedVersions.name, VERSION));
  if (done) return false;
  const [city] = await db.select().from(s.cities).where(eq(s.cities.slug, SALAMIYAH.slug));
  const [owner] = await db.select().from(s.users).where(eq(s.users.phone, ownerPhone));
  if (!city || !owner) return false;
  const urls = storage ? await publishPhotos(storage) : new Map<string, string>();
  const url = (name: string | undefined) => (name ? (urls.get(name) ?? null) : null);

  await db.transaction(async (tx) => {
    await tx
      .insert(s.categories)
      .values(FOOD_CATEGORIES.map((c, i) => ({ ...c, sortOrder: 100 + i })))
      .onConflictDoNothing({ target: s.categories.slug });
    const categoryBy = new Map((await tx.select().from(s.categories)).map((c) => [c.slug, c]));
    const areaBy = new Map((await tx.select().from(s.areas).where(eq(s.areas.cityId, city.id))).map((a) => [a.slug, a]));

    for (const [index, place] of FOOD_PLACES.entries()) {
      const category = categoryBy.get(place.category)!;
      const area = areaBy.get(place.area)!;
      const fields = {
        categoryId: category.id,
        areaId: area.id,
        description: place.description,
        phone: place.phone,
        whatsapp: place.phone,
        openingHours: place.hours,
        acceptsOrders: true,
        prepMinutes: place.prepMinutes,
        minOrder: place.minOrder,
        deliveryFee: place.deliveryFee,
        coverUrl: url(place.cover),
        logoUrl: url(place.logo),
        searchText: buildSearchText(place.name, category.nameAr, area.nameAr, place.description, ...place.items.map((i) => i.name)),
      };
      let [business] = await tx
        .select()
        .from(s.businesses)
        .where(and(eq(s.businesses.cityId, city.id), eq(s.businesses.name, place.name)));
      if (business) {
        await tx.update(s.businesses).set(fields).where(eq(s.businesses.id, business.id));
      } else {
        [business] = await tx
          .insert(s.businesses)
          .values({
            ...fields,
            cityId: city.id,
            slug: `${slugify(place.name)}-f${String(index + 1).padStart(2, '0')}`,
            name: place.name,
            vertical: 'food',
            address: `${area.nameAr}، سلمية`,
            lat: area.lat! + (index % 4) * 0.0012,
            lng: area.lng! - (index % 3) * 0.0011,
            status: 'active',
            verifiedAt: new Date(),
            ratingAvg: place.rating,
            ratingCount: 30 + index * 11,
          })
          .returning();
        await tx.insert(s.businessMembers).values({ businessId: business!.id, userId: owner.id, role: 'owner' });
      }
      const businessId = business!.id;

      const existing = await tx
        .select()
        .from(s.products)
        .where(and(eq(s.products.businessId, businessId), isNull(s.products.deletedAt)));
      const byName = new Map(existing.map((p) => [p.name, p]));
      for (const [i, item] of place.items.entries()) {
        const values = {
          section: item.section,
          price: item.price,
          description: item.description ?? null,
          imageUrl: url(item.photo),
          options: productOptionsSchema.parse(item.options ?? []),
          isFeatured: item.featured ?? false,
          sortOrder: i,
          searchText: buildSearchText(item.name, item.section, item.description),
        };
        const current = byName.get(item.name);
        if (current) await tx.update(s.products).set(values).where(eq(s.products.id, current.id));
        else await tx.insert(s.products).values({ ...values, businessId, name: item.name, stock: item.stock ?? null });
      }
      if (place.offers?.length) {
        await tx
          .insert(s.coupons)
          .values(place.offers.map((o) => ({ ...o, businessId, maxDiscount: o.maxDiscount ?? null, isPublic: true, isActive: true })))
          .onConflictDoNothing();
      }
      await tx
        .update(s.products)
        .set({ deletedAt: new Date(), isAvailable: false })
        .where(and(eq(s.products.businessId, businessId), inArray(s.products.name, RETIRED), isNull(s.products.deletedAt)));
    }
    await tx.insert(s.seedVersions).values({ name: VERSION });
  });
  return true;
}
