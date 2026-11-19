import type { PropertyListing, ViewingLead } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { setLeadStatus, setListingStatus } from '@/actions/property';
import { ButtonLink } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge, EmptyState, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { money, timeAgo } from '@/lib/format';
import { requireUser } from '@/lib/guards';
import { LEAD_STATUS_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'إعلاناتي العقارية' };

export default async function MyListingsPage() {
  await requireUser('/account/listings');
  const [listings, leads] = await Promise.all([api<PropertyListing[]>('/me/listings'), api<ViewingLead[]>('/me/listings/leads')]);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="إعلاناتي العقارية"><ButtonLink href="/property/new" size="sm">إعلان جديد</ButtonLink></PageHeader>
      <section>
        <SectionHeader title={`طلبات المعاينة (${leads.filter((l) => l.status === 'new').length} جديد)`} />
        {leads.length === 0 ? <p className="text-sm text-muted">لا طلبات بعد.</p> : (
          <ul className="card divide-y divide-sand/70">
            {leads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{l.name ?? 'مهتم'} · <a dir="ltr" href={`tel:${l.phone}`}>{l.phone}</a></p>
                  <p className="text-sm text-muted">{l.listingTitle} · {l.preferredTime ?? ''} · {timeAgo(l.createdAt)}</p>
                  {l.message && <p className="text-sm">{l.message}</p>}
                </div>
                <Badge tone={l.status === 'new' ? 'gold' : 'neutral'}>{LEAD_STATUS_LABEL[l.status]}</Badge>
                {l.status === 'new' && <form action={setLeadStatus.bind(null, l.id, 'contacted')}><SubmitButton size="sm" variant="secondary">تم التواصل</SubmitButton></form>}
                {l.status !== 'closed' && <form action={setLeadStatus.bind(null, l.id, 'closed')}><SubmitButton size="sm" variant="ghost">إغلاق</SubmitButton></form>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <SectionHeader title="إعلاناتي" />
        {listings.length === 0 ? <EmptyState title="لا إعلانات بعد" /> : (
          <ul className="card divide-y divide-sand/70">
            {listings.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 p-4">
                <Link href={`/property/${l.id}`} className="min-w-0 flex-1 font-semibold text-navy hover:underline">{l.title}</Link>
                <span className="text-sm">{money(l.price)}</span>
                <Badge tone={l.status === 'active' ? 'success' : 'neutral'}>{l.status === 'active' ? 'نشط' : l.status === 'sold' ? 'مباع' : l.status === 'rented' ? 'مؤجر' : 'مؤرشف'}</Badge>
                {l.status === 'active' && (
                  <form action={setListingStatus.bind(null, l.id, l.purpose === 'sale' ? 'sold' : 'rented')}>
                    <SubmitButton size="sm" variant="secondary">{l.purpose === 'sale' ? 'تم البيع' : 'تم التأجير'}</SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
