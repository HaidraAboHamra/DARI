'use client';

import { useActionState, useState } from 'react';
import { createEvent } from '@/actions/events';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/primitives';

export function EventForm() {
  const [state, action] = useActionState(createEvent, {});
  const [kind, setKind] = useState('event');
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="card grid gap-4 p-6 sm:grid-cols-2">
      <Field label="النوع"><Select name="kind" value={kind} onChange={(ev) => setKind(ev.target.value)}><option value="event">فعالية</option><option value="trip">رحلة</option></Select></Field>
      <Field label="العنوان" error={e.title}><Input name="title" required minLength={3} /></Field>
      <div className="sm:col-span-2"><Field label="الوصف" error={e.description}><Textarea name="description" rows={4} required minLength={10} /></Field></div>
      <Field label={kind === 'trip' ? 'مكان الانطلاق' : 'المكان'} error={e.venue}><Input name="venue" required /></Field>
      {kind === 'trip' && <Field label="الوجهة"><Input name="destination" /></Field>}
      <Field label="التاريخ" error={e.startsAt}><Input type="date" name="date" required /></Field>
      <Field label="الساعة"><Input type="time" name="time" defaultValue="18:00" /></Field>
      <Field label="عدد المقاعد" error={e.capacity}><Input name="capacity" inputMode="numeric" required /></Field>
      <Field label="سعر المقعد (0 = مجاني)" error={e.price}><Input name="price" inputMode="numeric" defaultValue="0" /></Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormError message={state.error} />
        <SubmitButton size="lg" pendingText="جارٍ النشر…">نشر</SubmitButton>
      </div>
    </form>
  );
}
