import { type BusinessSummary, type Category, type Page, type Vertical, VERTICAL_META, VERTICALS } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ServiceTile } from '@/components/brand/service-icon';
import { BusinessCard } from '@/components/directory/business-card';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';

type Params = { vertical: string };
type Search = { category?: string; cursor?: string };

function parseVertical(value: string): Vertical | null {
  return (VERTICALS as readonly string[]).includes(value) ? (value as Vertical) : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const vertical = parseVertical((await params).vertical);
  return { title: vertical ? VERTICAL_META[vertical].labelAr : 'استكشف' };
}

export default async function VerticalPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const vertical = parseVertical((await params).vertical);
  if (!vertical) notFound();
  const { category, cursor } = await searchParams;
  const meta = VERTICAL_META[vertical];

  const [categories, page] = await Promise.all([
    api<Category[]>('/categories', { query: { vertical }, revalidate: 300 }),
    api<Page<BusinessSummary>>('/businesses', { query: { city: config.city, vertical, categoryId: category, cursor, limit: 12 }, revalidate: 30 }),
  ]);
  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-medium ${active ? 'bg-navy text-champagne' : 'border border-sand bg-white text-ink/80 hover:border-gold'}`;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-4">
        <ServiceTile vertical={vertical} size="lg" />
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">{meta.labelAr}</h1>
          <p className="text-muted">في سلمية</p>
        </div>
      </header>

      {vertical === 'services' && (
        <div className="night flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] p-5 text-ivory">
          <p className="font-display text-lg font-bold">صف المشكلة واستلم عروض أسعار خلال دقائق</p>
          <ButtonLink href="/services/new">اطلب خدمة</ButtonLink>
        </div>
      )}

      {categories.length > 0 && (
        <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" aria-label="التصنيفات">
          <Link href={`/explore/${vertical}`} className={chip(!category)}>
            الكل
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/explore/${vertical}?category=${c.id}`} className={chip(category === c.id)}>
              {c.nameAr}
            </Link>
          ))}
        </nav>
      )}

      {page.items.length === 0 ? (
        <EmptyState title="لا يوجد نشاطات هنا بعد" hint="هل تملك نشاطاً في هذا القطاع؟ سجّله مجاناً وابدأ باستقبال الزبائن.">
          <ButtonLink href="/merchant/new">سجّل نشاطك</ButtonLink>
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      )}

      {page.nextCursor && (
        <div className="flex justify-center">
          <ButtonLink href={`/explore/${vertical}?${new URLSearchParams({ ...(category && { category }), cursor: page.nextCursor })}`} variant="secondary">
            المزيد
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
