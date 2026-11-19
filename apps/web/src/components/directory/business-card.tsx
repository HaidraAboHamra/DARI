import { type BusinessSummary, VERTICAL_META } from '@dari/contracts';
import Link from 'next/link';
import { ServiceGlyph } from '@/components/brand/service-icon';
import { Badge, Stars } from '@/components/ui/primitives';

export function BusinessCard({ business }: { business: BusinessSummary }) {
  const meta = VERTICAL_META[business.vertical];
  return (
    <Link href={`/b/${business.slug}`} className="card group flex overflow-hidden transition-shadow hover:shadow-lg">
      <div className="grid w-24 shrink-0 place-items-center sm:w-28" style={{ background: `linear-gradient(160deg, ${meta.color}26, ${meta.color}0d)` }}>
        <ServiceGlyph vertical={business.vertical} className="h-11 w-11 transition-transform group-hover:scale-105" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-bold text-navy">{business.name}</h3>
          {business.isVerified && <Badge tone="gold">موثّق</Badge>}
        </div>
        <p className="truncate text-sm text-muted">
          {[business.categoryName ?? meta.labelAr, business.areaName].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-auto flex items-center justify-between">
          <Stars value={business.ratingAvg} count={business.ratingCount} />
          {business.acceptsOrders && <span className="text-xs font-semibold text-success">يستقبل طلبات</span>}
        </div>
      </div>
    </Link>
  );
}
