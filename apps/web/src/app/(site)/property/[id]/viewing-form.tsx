'use client';

import { useActionState } from 'react';
import { requestViewing } from '@/actions/property';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Textarea } from '@/components/ui/primitives';

export function ViewingForm({ listingId }: { listingId: string }) {
  const [state, action] = useActionState(requestViewing.bind(null, listingId), {});
  if (state.ok) return <p className="card p-5 text-center font-semibold text-success">{state.message}</p>;
  return (
    <form action={action} className="card flex flex-col gap-3 p-5">
      <h2 className="font-display text-lg font-bold text-navy">اطلب معاينة</h2>
      <Field label="الوقت المناسب"><Input name="preferredTime" placeholder="مثال: السبت بعد العصر" /></Field>
      <Field label="رقم للتواصل (اختياري)"><Input name="phone" type="tel" dir="ltr" /></Field>
      <Field label="رسالة"><Textarea name="message" maxLength={1000} /></Field>
      <FormError message={state.error} />
      <SubmitButton pendingText="جارٍ الإرسال…">أرسل الطلب</SubmitButton>
    </form>
  );
}
