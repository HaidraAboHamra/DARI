'use client';

import { useActionState } from 'react';
import { sendQuote } from '@/actions/services';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormError, Input } from '@/components/ui/primitives';

export function QuoteForm({ requestId, businessId }: { requestId: string; businessId: string }) {
  const [state, action] = useActionState(sendQuote.bind(null, requestId, businessId), {});
  if (state.ok) return <p className="text-sm font-semibold text-success">{state.message}</p>;
  return (
    <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_2fr_auto]">
      <Input name="priceMin" inputMode="numeric" placeholder="السعر من" required className="!py-2" />
      <Input name="priceMax" inputMode="numeric" placeholder="إلى" required className="!py-2" />
      <Input name="etaMinutes" inputMode="numeric" placeholder="الوصول (دقيقة)" required className="!py-2" />
      <Input name="message" placeholder="ملاحظة للزبون (اختياري)" className="!py-2" />
      <SubmitButton size="sm" pendingText="…">إرسال عرض</SubmitButton>
      <div className="col-span-full"><FormError message={state.error} /></div>
    </form>
  );
}
