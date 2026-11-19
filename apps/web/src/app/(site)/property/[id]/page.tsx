import type { PropertyListing } from '@dari/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { TrackView } from '@/components/analytics/track-view';
import { ServiceGlyph } from '@/components/brand/service-icon';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { apiOrNull } from '@/lib/api';
import { money, timeAgo } from '@/lib/format';
import { PROPERTY_TYPE_LABEL, PURPOSE_LABEL } from '@/lib/labels';
import { currentUser } from '@/lib/session';
import { ViewingForm } from './viewing-form';

const getListing = cache((id: string) => (/^[0-9a-f-]{36}$/.test(id) ? apiOrNull<PropertyListing>(`/listings/${id}`, { revalidate: 30 }) : Promise.resolve(null)));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const l = await getListing((await params).id);
  return l ? { title: l.title, description: l.description.slice(0, 160) } : { title: 'غير موجود' };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [listing, user] = await Promise.all([getListing(id), currentUser()]);
  if (!listing) notFound();
  const facts: [string, string | null][] = [
    ['النوع', PROPERTY_TYPE_LABEL[listing.propertyType]!],
    ['الغرض', PURPOSE_LABEL[listing.purpose]!],
    ['الغرف', listing.rooms !== null ? String(listing.rooms) : null],
    ['المساحة', listing.sizeSqm ? `${listing.sizeSqm} م²` : null],
    ['المنطقة', listing.areaName],
    ['المعلن', listing.officeName ?? 'مالك'],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <TrackView name="entity.viewed" entityType="listing" entityId={listing.id} />
      <article className="flex flex-col gap-4">
        {listing.images.length ? (
          <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto rounded-[2rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {listing.images.map((src) => <img key={src} src={src} alt="" className="aspect-[4/3] w-full shrink-0 snap-center rounded-[2rem] object-cover sm:w-2/3" />)}
          </div>
        ) : (
          <div className="grid aspect-[16/7] place-items-center rounded-[2rem] bg-[#6B7F3A]/10"><ServiceGlyph vertical="property" className="h-20 w-20" /></div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="navy">{PURPOSE_LABEL[listing.purpose]}</Badge>
          {listing.isFeatured && <Badge tone="gold">مميز</Badge>}
          {listing.status !== 'active' && <Badge tone="danger">غير متاح</Badge>}
          <span className="text-sm text-muted">{timeAgo(listing.createdAt)}</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-navy">{listing.title}</h1>
        <p className="font-display text-2xl font-bold text-gold-deep">{money(listing.price)}{listing.purpose === 'rent' && <span className="text-base text-muted"> / شهرياً</span>}</p>
        <dl className="card grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
          {facts.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="text-sm text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
        </dl>
        <p className="whitespace-pre-line leading-loose">{listing.description}</p>
        {listing.address && <p className="text-sm text-muted">📍 {listing.address}</p>}
      </article>
      <aside>
        {user?.id === listing.ownerId ? (
          <div className="card flex flex-col gap-3 p-5"><p className="font-semibold">هذا إعلانك</p><ButtonLink href="/account/listings" variant="secondary">إدارة الإعلان والطلبات</ButtonLink></div>
        ) : user ? (
          <ViewingForm listingId={listing.id} />
        ) : (
          <div className="card flex flex-col items-center gap-3 p-6 text-center"><p className="font-semibold">سجّل دخولك لطلب معاينة</p><ButtonLink href={`/login?next=/property/${listing.id}`}>دخول</ButtonLink></div>
        )}
      </aside>
    </div>
  );
}
