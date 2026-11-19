'use client';

import type { BookingStatus } from '@dari/contracts';
import { useState, useTransition } from 'react';
import { changeBookingStatus } from '@/actions/bookings';
import { Button } from '@/components/ui/button';
import { BOOKING_ACTION_LABEL } from '@/lib/labels';

const DESTRUCTIVE = new Set<BookingStatus>(['cancelled', 'rejected', 'no_show']);

export function BookingActions({ bookingId, actions, path }: { bookingId: string; actions: BookingStatus[]; path: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!actions.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((s) => (
        <Button key={s} size="sm" variant={DESTRUCTIVE.has(s) ? 'danger' : 'primary'} disabled={pending}
          onClick={() => start(async () => {
            if (DESTRUCTIVE.has(s) && !confirm(`تأكيد: ${BOOKING_ACTION_LABEL[s]}؟`)) return;
            setError((await changeBookingStatus(bookingId, s, path)).error ?? null);
          })}>
          {BOOKING_ACTION_LABEL[s]}
        </Button>
      ))}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
