import type { PropertyListing } from '@dari/contracts';
import Link from 'next/link';
import { ServiceGlyph } from '@/components/brand/service-icon';
import { Badge } from '@/components/ui/primitives';
import { money } from '@/lib/format';
import { PROPERTY_TYPE_LABEL, PURPOSE_LABEL } from '@/lib/labels';

export function ListingCard({ listing }: { listing: PropertyListing }) {
  return (
    <Link href={`/property/${listing.id}`} className="card flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative grid aspect-[16/9] place-items-center bg-[#6B7F3A]/10">
        {listing.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ServiceGlyph vertical="property" className="h-14 w-14" />
        )}
        <span className="absolute start-3 top-3 flex gap-1">
          <Badge tone="navy">{PURPOSE_LABEL[listing.purpose]}</Badge>
          {listing.isFeatured && <Badge tone="gold">مميز</Badge>}
        </span>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <p className="font-display text-lg font-bold text-gold-deep">{money(listing.price)}{listing.purpose === 'rent' && <span className="text-sm text-muted"> / شهرياً</span>}</p>
        <h3 className="line-clamp-1 font-bold text-navy">{listing.title}</h3>
        <p className="text-sm text-muted">
          {[PROPERTY_TYPE_LABEL[listing.propertyType], listing.rooms ? `${listing.rooms} غرف` : null, listing.sizeSqm ? `${listing.sizeSqm} م²` : null, listing.areaName].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  );
}
