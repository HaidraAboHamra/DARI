import { type Area, LISTING_PURPOSES, type Page, PROPERTY_TYPES, type PropertyListing } from '@dari/contracts';
import type { Metadata } from 'next';
import { ListingCard } from '@/components/content/listing-card';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, PageHeader, Select } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { PROPERTY_TYPE_LABEL, PURPOSE_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'عقارات سلمية' };

type Search = { purpose?: string; type?: string; area?: string; maxPrice?: string; cursor?: string };

export default async function PropertyPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const purpose = (LISTING_PURPOSES as readonly string[]).includes(sp.purpose ?? '') ? sp.purpose : undefined;
  const type = (PROPERTY_TYPES as readonly string[]).includes(sp.type ?? '') ? sp.type : undefined;
  const maxPrice = sp.maxPrice && /^\d+$/.test(sp.maxPrice) ? sp.maxPrice : undefined;
  const [page, areas] = await Promise.all([
    api<Page<PropertyListing>>('/listings', { query: { city: config.city, purpose, propertyType: type, areaId: sp.area, maxPrice, cursor: sp.cursor, limit: 18 }, revalidate: 30 }),
    api<Area[]>(`/cities/${config.city}/areas`, { revalidate: 300 }),
  ]);
  return (
    <>
      <PageHeader title="عقارات" subtitle="بيع وإيجار: بيوت، شقق، أراضٍ، محلات ومزارع">
        <ButtonLink href="/property/new" size="sm">أضف إعلاناً</ButtonLink>
      </PageHeader>
      <form className="card mb-6 grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
        <Select name="purpose" defaultValue={purpose ?? ''}><option value="">بيع وإيجار</option>{LISTING_PURPOSES.map((p) => <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>)}</Select>
        <Select name="type" defaultValue={type ?? ''}><option value="">كل الأنواع</option>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABEL[t]}</option>)}</Select>
        <Select name="area" defaultValue={sp.area ?? ''}><option value="">كل المناطق</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.nameAr}</option>)}</Select>
        <Select name="maxPrice" defaultValue={maxPrice ?? ''}>
          <option value="">أي سعر</option>
          {[2_000_000, 10_000_000, 100_000_000, 300_000_000, 500_000_000].map((p) => <option key={p} value={p}>حتى {new Intl.NumberFormat('ar-SY', { notation: 'compact' }).format(p)}</option>)}
        </Select>
        <button className="col-span-2 rounded-2xl bg-navy py-3 font-semibold text-champagne md:col-span-1">تصفية</button>
      </form>
      {page.items.length === 0 ? <EmptyState title="لا نتائج بهذه المواصفات" hint="جرّب توسيع البحث أو أضف طلبك في البحث العام ليصل للمكاتب." /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{page.items.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
      )}
      {page.nextCursor && <div className="mt-6 flex justify-center"><ButtonLink variant="secondary" href={`/property?${new URLSearchParams({ ...(purpose && { purpose }), ...(type && { type }), cursor: page.nextCursor })}`}>المزيد</ButtonLink></div>}
    </>
  );
}
