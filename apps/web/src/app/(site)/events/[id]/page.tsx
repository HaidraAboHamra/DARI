import type { CityEvent } from '@dari/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { TrackView } from '@/components/analytics/track-view';
import { ServiceGlyph } from '@/components/brand/service-icon';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { apiOrNull } from '@/lib/api';
import { money } from '@/lib/format';
import { eventWhen } from '@/lib/labels';
import { currentUser } from '@/lib/session';
import { BuyForm } from './buy-form';

const getEvent = cache((id: string) => (/^[0-9a-f-]{36}$/.test(id) ? apiOrNull<CityEvent>(`/events/${id}`, { revalidate: 15 }) : Promise.resolve(null)));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const event = await getEvent((await params).id);
  return event ? { title: event.title, description: event.description.slice(0, 160) } : { title: 'غير موجود' };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, user] = await Promise.all([getEvent(id), currentUser()]);
  if (!event) notFound();
  const isOrganizer = user && (user.id === event.organizerId || user.role === 'admin');
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <TrackView name="entity.viewed" entityType="event" entityId={event.id} />
      <article className="flex flex-col gap-4">
        <div className="night flex items-center gap-4 rounded-[2rem] p-6 text-ivory">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10">
            <ServiceGlyph vertical={event.kind === 'trip' ? 'trips' : 'events'} className="h-10 w-10" color="#EBD596" />
          </span>
          <div>
            <Badge tone="gold">{event.kind === 'trip' ? 'رحلة' : 'فعالية'}</Badge>
            <h1 className="mt-2 font-display text-3xl font-bold">{event.title}</h1>
            <p className="text-ivory/70">{event.organizerName}</p>
          </div>
        </div>
        <dl className="card grid gap-3 p-5 sm:grid-cols-2">
          <div><dt className="text-sm text-muted">الموعد</dt><dd className="font-semibold">{eventWhen(event.startsAt)}</dd></div>
          <div><dt className="text-sm text-muted">{event.kind === 'trip' ? 'الانطلاق' : 'المكان'}</dt><dd className="font-semibold">{event.venue}</dd></div>
          {event.destination && <div><dt className="text-sm text-muted">الوجهة</dt><dd className="font-semibold">{event.destination}</dd></div>}
          <div><dt className="text-sm text-muted">السعر</dt><dd className="font-semibold">{event.price ? money(event.price) : 'مجاني'}</dd></div>
          <div><dt className="text-sm text-muted">المقاعد المتاحة</dt><dd className="font-semibold">{event.seatsLeft} من {event.capacity}</dd></div>
        </dl>
        <p className="whitespace-pre-line leading-loose">{event.description}</p>
      </article>
      <aside className="flex flex-col gap-3">
        {event.seatsLeft > 0 ? <BuyForm eventId={event.id} price={event.price} seatsLeft={event.seatsLeft} /> : <p className="card p-6 text-center font-bold text-danger">نفدت المقاعد</p>}
        {isOrganizer && <ButtonLink href={`/events/${event.id}/manage`} variant="secondary">إدارة الحضور والتذاكر</ButtonLink>}
      </aside>
    </div>
  );
}
