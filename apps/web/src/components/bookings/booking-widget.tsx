'use client';

import type { BookableResource, Slot } from '@dari/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { createBooking, getSlots, quoteNights } from '@/actions/bookings';
import { track } from '@/components/analytics/track';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input, Select } from '@/components/ui/primitives';
import { money } from '@/lib/format';

const TZ = 'Asia/Damascus';
const dayFormat = new Intl.DateTimeFormat('ar-SY', { weekday: 'short', day: 'numeric', timeZone: TZ });
const timeFormat = new Intl.DateTimeFormat('ar-SY', { hour: 'numeric', minute: '2-digit', timeZone: TZ });

function localDays(count: number): { value: string; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.now() + i * 86_400_000);
    return { value: new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d), label: i === 0 ? 'اليوم' : i === 1 ? 'بكرا' : dayFormat.format(d) };
  });
}

/** Pick a resource, then a slot (appointments, courts) or a date range (rooms, farms). */
export function BookingWidget({ resources }: { resources: BookableResource[] }) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState(resources[0]!.id);
  const resource = resources.find((r) => r.id === resourceId)!;
  const days = useMemo(() => localDays(10), []);
  const [date, setDate] = useState(days[0]!.value);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(days[1]!.value);
  const [checkOut, setCheckOut] = useState(days[2]!.value);
  const [quote, setQuote] = useState<{ nights: number; available: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setPicked(null);
    setError(null);
    if (resource.unit === 'slot') {
      setSlots(null);
      void getSlots(resource.id, date).then(setSlots);
    } else {
      setQuote(null);
      void quoteNights(resource.id, checkIn, checkOut).then((q) => ('error' in q ? setError(q.error) : setQuote(q)));
    }
  }, [resource.id, resource.unit, date, checkIn, checkOut]);

  const confirm = () =>
    start(async () => {
      const result = await createBooking(resource.unit === 'slot' ? { resourceId, startsAt: picked! } : { resourceId, checkIn, checkOut });
      if (result.needsLogin) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
      if (result.error || !result.booking) return setError(result.error ?? 'تعذر الحجز');
      track({ name: 'booking.created', entityType: 'booking', entityId: result.booking.id });
      router.push('/bookings');
    });

  return (
    <div className="card flex flex-col gap-4 p-5">
      {resources.length > 1 && (
        <Field label="ماذا تريد أن تحجز؟">
          <Select value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.name} — {money(r.price)}{r.unit === 'night' ? ' / ليلة' : ''}</option>
            ))}
          </Select>
        </Field>
      )}
      {resource.description && <p className="text-sm text-muted">{resource.description}</p>}

      {resource.unit === 'slot' ? (
        <>
          <div className="no-scrollbar flex gap-2 overflow-x-auto" role="radiogroup" aria-label="اليوم">
            {days.map((d) => (
              <button key={d.value} type="button" role="radio" aria-checked={date === d.value} onClick={() => setDate(d.value)}
                className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold ${date === d.value ? 'bg-navy text-champagne' : 'border border-sand bg-white'}`}>
                {d.label}
              </button>
            ))}
          </div>
          {slots === null ? (
            <p className="text-sm text-muted">جارٍ تحميل المواعيد…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">لا مواعيد متاحة في هذا اليوم.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="الموعد">
              {slots.map((s) => (
                <button key={s.startsAt} type="button" disabled={s.available < 1} role="radio" aria-checked={picked === s.startsAt} onClick={() => setPicked(s.startsAt)}
                  className={`rounded-xl py-2 text-sm font-semibold tabular-nums disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through ${picked === s.startsAt ? 'bg-gold text-navy' : 'border border-sand bg-white'}`}>
                  {timeFormat.format(new Date(s.startsAt))}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="الوصول"><Input type="date" value={checkIn} min={days[0]!.value} onChange={(e) => setCheckIn(e.target.value)} /></Field>
          <Field label="المغادرة"><Input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} /></Field>
          {quote && (
            <p className="col-span-2 text-sm">
              {quote.available > 0 ? <>متاح · {quote.nights} ليلة · <strong>{money(quote.total)}</strong></> : <span className="text-danger">غير متاح في هذه التواريخ</span>}
            </p>
          )}
        </div>
      )}

      <FormError message={error} />
      <Button size="lg" disabled={pending || (resource.unit === 'slot' ? !picked : !quote?.available)} onClick={confirm}>
        {pending ? 'جارٍ الحجز…' : resource.autoConfirm ? 'احجز الآن' : 'أرسل طلب الحجز'}
      </Button>
      {!resource.autoConfirm && <p className="text-center text-xs text-muted">يؤكد النشاط الحجز ويصلك إشعار.</p>}
    </div>
  );
}
