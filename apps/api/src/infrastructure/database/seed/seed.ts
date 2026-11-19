import { buildSearchText } from '../../../modules/directory/search-text';
import { loadEnv } from '../../../config/env';
import { slugify } from '@dari/contracts';
import { eq } from 'drizzle-orm';
import { createDatabase, createPool, type Database } from '../database.module';
import * as s from '../schema';
import { AREAS, ARTICLES, BUSINESSES, CATEGORIES, JOBS, SALAMIYAH } from './seed-data';
import { EVENTS, LISTINGS, RESOURCES } from './seed-extras';

/** Demo accounts (log in with the dev OTP code). */
export const SEED_USERS = {
  admin: { phone: '+963900000001', name: 'مدير المنصة', role: 'admin' as const },
  merchant: { phone: '+963900000002', name: 'سامر التاجر', role: 'citizen' as const },
  courier: { phone: '+963900000003', name: 'مندوب داري', role: 'courier' as const },
  editor: { phone: '+963900000004', name: 'محرر الأخبار', role: 'editor' as const },
  citizen: { phone: '+963900000005', name: 'أحمد محمد', role: 'citizen' as const },
};

export async function seed(db: Database): Promise<{ skipped: boolean }> {
  const [existing] = await db.select().from(s.cities).where(eq(s.cities.slug, SALAMIYAH.slug));
  if (existing) {
    const extras = await seedExtras(db);
    return { skipped: !extras };
  }

  await db.transaction(async (tx) => {
    const [city] = await tx.insert(s.cities).values(SALAMIYAH).returning();
    const areaRows = await tx.insert(s.areas).values(AREAS.map((a) => ({ ...a, cityId: city!.id }))).returning();
    const categoryRows = await tx
      .insert(s.categories)
      .values(CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })))
      .returning();

    const userRows = await tx
      .insert(s.users)
      .values(Object.values(SEED_USERS).map((u) => ({ ...u, cityId: city!.id, phoneVerifiedAt: new Date() })))
      .returning();
    const userBy = (phone: string) => userRows.find((u) => u.phone === phone)!;
    const merchant = userBy(SEED_USERS.merchant.phone);
    const editor = userBy(SEED_USERS.editor.phone);

    const areaBy = new Map(areaRows.map((a) => [a.slug, a]));
    const categoryBy = new Map(categoryRows.map((c) => [c.slug, c]));

    for (const [index, b] of BUSINESSES.entries()) {
      const category = categoryBy.get(b.category)!;
      const area = areaBy.get(b.area)!;
      const [business] = await tx
        .insert(s.businesses)
        .values({
          cityId: city!.id,
          slug: `${slugify(b.name)}-${String(index + 1).padStart(3, '0')}`,
          name: b.name,
          vertical: category.vertical,
          categoryId: category.id,
          areaId: area.id,
          description: b.description,
          phone: b.phone,
          whatsapp: b.phone,
          address: `${area.nameAr}، سلمية`,
          lat: area.lat! + (index % 5) * 0.0011,
          lng: area.lng! - (index % 3) * 0.0013,
          openingHours: b.hours,
          status: 'active',
          verifiedAt: new Date(),
          acceptsOrders: b.acceptsOrders ?? false,
          ratingAvg: b.rating ?? 0,
          ratingCount: b.rating ? 20 + index * 7 : 0,
          searchText: buildSearchText(b.name, category.nameAr, area.nameAr, b.description),
        })
        .returning();
      // The demo merchant owns the first business; everything else is owned by the admin.
      await tx.insert(s.businessMembers).values({
        businessId: business!.id,
        userId: index === 0 ? merchant.id : userBy(SEED_USERS.admin.phone).id,
        role: 'owner',
      });
      if (b.products?.length) {
        await tx.insert(s.products).values(
          b.products.map((p, i) => ({
            businessId: business!.id,
            name: p.name,
            description: p.description ?? null,
            section: p.section ?? null,
            price: p.price,
            stock: p.stock ?? null,
            sortOrder: i,
            searchText: buildSearchText(p.name, p.section, p.description),
          })),
        );
      }
    }

    await tx.insert(s.jobs).values(
      JOBS.map((j, i) => ({
        ...j,
        cityId: city!.id,
        postedById: merchant.id,
        areaId: areaRows[i % areaRows.length]!.id,
        contactPhone: '+963944000200',
        searchText: buildSearchText(j.title, j.description),
      })),
    );

    await tx.insert(s.articles).values(
      ARTICLES.map((a, i) => ({
        ...a,
        cityId: city!.id,
        authorId: editor.id,
        slug: `${slugify(a.title).slice(0, 60)}-${i + 1}`,
        body: `${a.summary}\n\nتابعوا داري لمزيد من التفاصيل والتحديثات حول هذا الخبر.`,
        status: 'published' as const,
        publishedAt: new Date(Date.now() - i * 86_400_000),
        searchText: buildSearchText(a.title, a.summary, a.category),
      })),
    );
  });
  await seedExtras(db);
  return { skipped: false };
}

/** Bookable resources, events/trips and property listings. Idempotent: runs once per database. */
export async function seedExtras(db: Database): Promise<boolean> {
  const [already] = await db.select({ id: s.bookableResources.id }).from(s.bookableResources).limit(1);
  if (already) return false;
  const [city] = await db.select().from(s.cities).where(eq(s.cities.slug, SALAMIYAH.slug));
  const [admin] = await db.select().from(s.users).where(eq(s.users.phone, SEED_USERS.admin.phone));
  if (!city || !admin) return false;
  const all = await db.select({ id: s.businesses.id, name: s.businesses.name }).from(s.businesses).where(eq(s.businesses.cityId, city.id));
  const businessBy = new Map(all.map((b) => [b.name, b.id]));
  const areaRows = await db.select().from(s.areas).where(eq(s.areas.cityId, city.id));
  const areaBy = new Map(areaRows.map((a) => [a.slug, a]));

  await db.transaction(async (tx) => {
    await tx.insert(s.bookableResources).values(
      RESOURCES.filter((r) => businessBy.has(r.business)).map(({ business, ...r }) => ({
        ...r,
        businessId: businessBy.get(business)!,
        weeklyHours: r.weeklyHours ?? [],
      })),
    );
    const now = Date.now();
    await tx.insert(s.cityEvents).values(
      EVENTS.map(({ inDays, hours, ...e }) => {
        const startsAt = new Date(now + inDays * 86_400_000);
        startsAt.setUTCHours(15, 0, 0, 0);
        return {
          ...e,
          destination: 'destination' in e ? e.destination : null,
          cityId: city.id,
          organizerId: admin.id,
          businessId: e.kind === 'trip' ? (businessBy.get('رحلات الوادي') ?? null) : null,
          startsAt,
          endsAt: new Date(startsAt.getTime() + hours * 3_600_000),
          searchText: buildSearchText(e.title, e.description, e.venue),
        };
      }),
    );
    await tx.insert(s.propertyListings).values(
      LISTINGS.map(({ area, ...l }) => ({
        ...l,
        cityId: city.id,
        ownerId: admin.id,
        businessId: businessBy.get('مكتب الريان العقاري') ?? null,
        areaId: areaBy.get(area)?.id ?? null,
        address: `${areaBy.get(area)?.nameAr ?? ''}، سلمية`,
        searchText: buildSearchText(l.title, l.description, areaBy.get(area)?.nameAr),
      })),
    );
  });
  return true;
}

if (require.main === module) {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL, 2);
  seed(createDatabase(pool))
    .then((r) => console.log(r.skipped ? '• seed skipped (city already exists)' : '✓ demo data seeded'))
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => void pool.end());
}
