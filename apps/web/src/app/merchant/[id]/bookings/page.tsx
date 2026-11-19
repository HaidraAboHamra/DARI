import { type BookableResource, type Booking, nextBookingStatuses, type Page } from '@dari/contracts';
import { toggleResource } from '@/actions/bookings';
import { BookingActions } from '@/components/bookings/booking-actions';
import { AutoRefresh } from '@/components/shell/auto-refresh';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge, EmptyState, SectionHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { BOOKING_STATUS_LABEL, bookingWhen } from '@/lib/labels';
import { ResourceForm } from './resource-form';

export default async function MerchantBookingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Damascus' }).format(new Date());
  const [resources, bookings] = await Promise.all([
    api<BookableResource[]>(`/merchant/businesses/${id}/resources`),
    api<Page<Booking>>(`/merchant/businesses/${id}/bookings`, { query: { from: today, limit: 50 } }),
  ]);
  const path = `/merchant/${id}/bookings`;
  const upcoming = [...bookings.items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />
      <section>
        <SectionHeader title={`الحجوزات القادمة (${upcoming.length})`} />
        {upcoming.length === 0 ? (
          <EmptyState title="لا حجوزات قادمة" hint={resources.length ? 'تصل الحجوزات هنا مباشرة.' : 'أضف مورداً قابلاً للحجز ليظهر زر «احجز» في صفحتك.'} />
        ) : (
          <ul className="card divide-y divide-sand/70">
            {upcoming.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{bookingWhen(b)}</p>
                  <p className="text-sm text-muted">{b.resourceName} · {b.customerName ?? 'زبون'} · <span dir="ltr">{b.number}</span></p>
                </div>
                <span className="text-sm font-semibold">{money(b.total)}</span>
                <Badge tone={b.status === 'confirmed' ? 'success' : b.status === 'pending' ? 'gold' : 'danger'}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                <BookingActions bookingId={b.id} actions={nextBookingStatuses(b.status, 'merchant', new Date(b.startsAt))} path={path} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader title="الموارد القابلة للحجز" />
        {resources.length > 0 && (
          <ul className="card mb-4 divide-y divide-sand/70">
            {resources.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="font-semibold text-navy">{r.name}</p>
                  <p className="text-sm text-muted">{r.unit === 'slot' ? `${r.slotMinutes} دقيقة` : 'بالليلة'} · سعة {r.capacity} · {money(r.price)} {r.autoConfirm && '· تأكيد تلقائي'}</p>
                </div>
                <form action={toggleResource.bind(null, id, r.id, !r.isActive)}>
                  <SubmitButton size="sm" variant={r.isActive ? 'secondary' : 'primary'}>{r.isActive ? 'إيقاف' : 'تفعيل'}</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="card p-5"><ResourceForm businessId={id} /></div>
      </section>
    </div>
  );
}
