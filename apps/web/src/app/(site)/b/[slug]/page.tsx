import { type BookableResource, type BusinessDetail, isOpenAt, type Page, type Product, type Review, VERTICAL_META } from '@dari/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { TrackView } from '@/components/analytics/track-view';
import { BookingWidget } from '@/components/bookings/booking-widget';
import { ServiceGlyph } from '@/components/brand/service-icon';
import { ClockIcon, PinIcon } from '@/components/ui/icons';
import { Badge, SectionHeader, Stars } from '@/components/ui/primitives';
import { api, apiOrNull } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { currentUser } from '@/lib/session';
import { ContactButtons } from './contact-buttons';
import { Menu } from './menu';
import { ReviewForm } from './review-form';

type Params = { slug: string };
const getBusiness = cache((slug: string) =>
  // Next passes non-ASCII params percent-encoded; normalize before re-encoding.
  apiOrNull<BusinessDetail>(`/businesses/by-slug/${encodeURIComponent(decodeURIComponent(slug))}`, { revalidate: 60 }),
);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const business = await getBusiness((await params).slug);
  if (!business) return { title: 'غير موجود' };
  return {
    title: business.name,
    description: business.description ?? `${business.name} في سلمية على داري`,
    openGraph: { title: business.name, description: business.description ?? undefined, locale: 'ar_SY', type: 'website' },
  };
}

export default async function BusinessPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();

  const [products, resources, reviews, user] = await Promise.all([
    api<Product[]>(`/businesses/${business.id}/products`, { revalidate: 60 }).catch(() => []),
    api<BookableResource[]>(`/businesses/${business.id}/resources`, { revalidate: 30 }).catch(() => []),
    api<Page<Review>>(`/businesses/${business.id}/reviews`, { query: { limit: 10 }, revalidate: 60 }),
    currentUser(),
  ]);
  const meta = VERTICAL_META[business.vertical];
  const open = isOpenAt(business.openingHours, new Date(), 'Asia/Damascus');

  return (
    <div className="flex flex-col gap-8">
      <TrackView name="entity.viewed" entityType="business" entityId={business.id} />
      <section className="night -mx-4 -mt-6 px-4 pt-8 pb-8 text-ivory sm:mx-0 sm:mt-0 sm:rounded-[2rem] sm:px-10">
        <div className="flex items-start gap-4">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-white/10">
            <ServiceGlyph vertical={business.vertical} className="h-12 w-12" color="#EBD596" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{business.name}</h1>
              {business.isVerified && <Badge tone="gold">موثّق ✓</Badge>}
            </div>
            <p className="mt-1 text-ivory/70">{[business.categoryName ?? meta.labelAr, business.areaName].filter(Boolean).join(' · ')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <span className="[&_*]:!text-ivory"><Stars value={business.ratingAvg} count={business.ratingCount} /></span>
              {business.openingHours.length > 0 && (
                <span className={`inline-flex items-center gap-1 font-semibold ${open ? 'text-emerald-300' : 'text-rose-300'}`}>
                  <ClockIcon className="h-4 w-4" /> {open ? 'مفتوح الآن' : 'مغلق الآن'}
                </span>
              )}
            </div>
          </div>
        </div>
        {business.description && <p className="mt-5 max-w-2xl leading-relaxed text-ivory/85">{business.description}</p>}
        {business.address && (
          <p className="mt-3 inline-flex items-center gap-1 text-sm text-ivory/70">
            <PinIcon className="h-4 w-4" /> {business.address}
          </p>
        )}
        <div className="mt-5 [&_a:not(:first-child)]:!border-champagne/40 [&_a:not(:first-child)]:!text-champagne">
          <ContactButtons businessId={business.id} phone={business.phone} whatsapp={business.whatsapp} location={business.location} />
        </div>
      </section>

      {resources.length > 0 && (
        <section>
          <SectionHeader title="احجز موعدك" />
          <BookingWidget resources={resources} />
        </section>
      )}

      {products.length > 0 && (
        <section>
          <SectionHeader title={business.acceptsOrders ? 'اطلب الآن' : 'القائمة والأسعار'} />
          <Menu business={business} products={products} />
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <SectionHeader title={`التقييمات (${business.ratingCount})`} />
          {reviews.items.length === 0 ? (
            <p className="text-muted">لا توجد تقييمات مكتوبة بعد.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {reviews.items.map((r) => (
                <li key={r.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy">{r.authorName ?? 'زبون'}</span>
                    <Stars value={r.rating} />
                  </div>
                  {r.body && <p className="mt-2 text-sm leading-relaxed">{r.body}</p>}
                  <p className="mt-2 text-xs text-muted">{timeAgo(r.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        {user ? <ReviewForm businessId={business.id} slug={business.slug} /> : null}
      </section>
    </div>
  );
}
