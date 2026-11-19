'use client';

import { useActionState, useState } from 'react';
import { buyTickets } from '@/actions/events';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormError } from '@/components/ui/primitives';
import { money } from '@/lib/format';

export function BuyForm({ eventId, price, seatsLeft }: { eventId: string; price: number; seatsLeft: number }) {
  const [state, action] = useActionState(buyTickets.bind(null, eventId), {});
  const [qty, setQty] = useState(1);
  const max = Math.min(20, seatsLeft);
  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <input type="hidden" name="quantity" value={qty} />
      <div className="flex items-center justify-between">
        <span className="font-semibold">عدد المقاعد</span>
        <div className="flex items-center gap-2">
          <button type="button" className="h-9 w-9 rounded-full border border-sand" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="إنقاص">−</button>
          <span className="w-6 text-center font-bold tabular-nums">{qty}</span>
          <button type="button" className="h-9 w-9 rounded-full bg-gold text-navy" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="زيادة">+</button>
        </div>
      </div>
      <p className="flex justify-between text-sm"><span className="text-muted">الإجمالي</span><strong>{price ? money(price * qty) : 'مجاني'}</strong></p>
      <FormError message={state.error} />
      <SubmitButton size="lg" pendingText="جارٍ الحجز…">احجز {qty > 1 ? `${qty} مقاعد` : 'مقعدك'}</SubmitButton>
      <p className="text-center text-xs text-muted">تصلك تذكرة رقمية برمز QR تبرزها عند الدخول.</p>
    </form>
  );
}
