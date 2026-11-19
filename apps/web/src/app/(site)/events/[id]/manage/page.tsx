import type { CityEvent } from '@dari/contracts';
import { notFound } from 'next/navigation';
import { Badge, PageHeader, SectionHeader, Stat } from '@/components/ui/primitives';
import { api, apiOrNull } from '@/lib/api';
import { requireUser } from '@/lib/guards';
import { CheckIn } from './check-in';

interface Attendee { code: string; quantity: number; status: string; name: string | null; checkedInAt: string | null }

export default async function ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/events/${id}/manage`);
  const [event, attendees] = await Promise.all([apiOrNull<CityEvent>(`/events/${id}`), apiOrNull<Attendee[]>(`/events/${id}/attendees`)]);
  if (!event || !attendees) notFound();
  const sold = attendees.filter((a) => a.status !== 'cancelled').reduce((n, a) => n + a.quantity, 0);
  const inside = attendees.filter((a) => a.status === 'checked_in').reduce((n, a) => n + a.quantity, 0);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={event.title} subtitle="إدارة التذاكر والدخول" />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="المقاعد المحجوزة" value={sold} hint={`من ${event.capacity}`} />
        <Stat label="دخلوا" value={inside} />
        <Stat label="متبقي" value={event.seatsLeft} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <CheckIn eventId={id} />
        <section>
          <SectionHeader title="الحضور" />
          <ul className="card divide-y divide-sand/70">
            {attendees.map((a) => (
              <li key={a.code} className="flex items-center justify-between p-3 text-sm">
                <span className="font-semibold">{a.name ?? 'زائر'}</span>
                <span className="font-mono" dir="ltr">{a.code}</span>
                <span>{a.quantity}</span>
                <Badge tone={a.status === 'checked_in' ? 'success' : a.status === 'cancelled' ? 'danger' : 'neutral'}>{a.status === 'checked_in' ? 'دخل' : a.status === 'cancelled' ? 'ملغاة' : 'لم يدخل'}</Badge>
              </li>
            ))}
            {attendees.length === 0 && <li className="p-4 text-sm text-muted">لا تذاكر بعد.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
