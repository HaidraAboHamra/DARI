import type { CityEvent, Page } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EventCard } from '@/components/content/event-card';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'فعاليات ورحلات' };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ kind?: string; cursor?: string }> }) {
  const { kind: raw, cursor } = await searchParams;
  const kind = raw === 'trip' || raw === 'event' ? raw : undefined;
  const page = await api<Page<CityEvent>>('/events', { query: { city: config.city, kind, cursor, limit: 20 }, revalidate: 30 });
  const tab = (value: string | undefined, label: string) => (
    <Link href={value ? `/events?kind=${value}` : '/events'} className={`rounded-full px-4 py-2 text-sm font-semibold ${kind === value ? 'bg-navy text-champagne' : 'border border-sand bg-white'}`}>{label}</Link>
  );
  return (
    <>
      <PageHeader title={kind === 'trip' ? 'رحلات' : kind === 'event' ? 'فعاليات' : 'فعاليات ورحلات'} subtitle="احجز مقعدك واحصل على تذكرة رقمية">
        <ButtonLink href="/events/new" variant="secondary" size="sm">نظّم فعالية</ButtonLink>
      </PageHeader>
      <nav className="mb-5 flex gap-2">{tab(undefined, 'الكل')}{tab('event', 'فعاليات')}{tab('trip', 'رحلات')}</nav>
      {page.items.length === 0 ? <EmptyState title="لا شيء قادم حالياً" /> : (
        <div className="grid gap-3 md:grid-cols-2">{page.items.map((e) => <EventCard key={e.id} event={e} />)}</div>
      )}
      {page.nextCursor && <div className="mt-6 flex justify-center"><ButtonLink variant="secondary" href={`/events?${new URLSearchParams({ ...(kind && { kind }), cursor: page.nextCursor })}`}>المزيد</ButtonLink></div>}
    </>
  );
}
