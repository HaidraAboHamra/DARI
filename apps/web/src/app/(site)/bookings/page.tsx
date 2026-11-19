import { type Booking, nextBookingStatuses, type Page } from '@dari/contracts';
import type { Metadata } from 'next';
import { BookingActions } from '@/components/bookings/booking-actions';
import { ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState, PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { requireUser } from '@/lib/guards';
import { BOOKING_STATUS_LABEL, bookingWhen } from '@/lib/labels';

export const metadata: Metadata = { title: 'حجوزاتي' };

export default async function MyBookingsPage() {
  await requireUser('/bookings');
  const page = await api<Page<Booking>>('/bookings', { query: { limit: 30 } });
  return (
    <>
      <PageHeader title="حجوزاتي" subtitle="مواعيد الأطباء، الملاعب، الفنادق والمزارع" />
      {page.items.length === 0 ? (
        <EmptyState title="لا حجوزات بعد">
          <ButtonLink href="/explore/appointments">احجز موعداً</ButtonLink>
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {page.items.map((b) => (
            <li key={b.id} className="card flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-navy">{b.businessName}</p>
                  <p className="text-sm text-muted">{b.resourceName} · <span dir="ltr">{b.number}</span></p>
                </div>
                <Badge tone={b.status === 'confirmed' || b.status === 'completed' ? 'success' : b.status === 'pending' ? 'gold' : 'danger'}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
              </div>
              <p className="text-sm font-medium">{bookingWhen(b)}</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{money(b.total)}</span>
                <BookingActions bookingId={b.id} actions={nextBookingStatuses(b.status, 'customer', new Date(b.startsAt))} path="/bookings" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
