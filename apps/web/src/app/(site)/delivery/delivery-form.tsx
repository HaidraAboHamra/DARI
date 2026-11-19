'use client';

import { useActionState } from 'react';
import { requestDelivery } from '@/actions/community';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/primitives';
import { DELIVERY_TYPE_LABEL } from '@/lib/labels';

const TYPES = ['buy_for_me', 'citizen_to_citizen', 'document', 'store_to_citizen', 'shop_to_shop', 'event_logistics'] as const;

export function DeliveryForm() {
  const [state, action] = useActionState(requestDelivery, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="card flex flex-col gap-4 p-6" key={state.ok ? 'sent' : 'form'}>
      {state.ok && <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">{state.message}</p>}
      <Field label="نوع المهمة">
        <Select name="type" defaultValue="buy_for_me">
          {TYPES.map((t) => <option key={t} value={t}>{DELIVERY_TYPE_LABEL[t]}</option>)}
        </Select>
      </Field>
      <Field label="شو بدك نوصّل أو نشتري؟" error={e.itemDescription}>
        <Textarea name="itemDescription" required minLength={2} placeholder="مثال: ربطتين خبز وكيلو بندورة من سوق الهال" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="من (الاستلام)" error={e['pickup.text']}><Input name="pickup" required minLength={3} placeholder="اسم المحل أو العنوان" /></Field>
        <Field label="هاتف الاستلام" error={e['pickup.contactPhone']}><Input name="pickupPhone" type="tel" dir="ltr" /></Field>
        <Field label="إلى (التسليم)" error={e['dropoff.text']}><Input name="dropoff" required minLength={3} placeholder="الحي، الشارع، أقرب معلم" /></Field>
        <Field label="هاتف المستلم" error={e['dropoff.contactPhone']}><Input name="dropoffPhone" type="tel" dir="ltr" /></Field>
      </div>
      <Field label="ملاحظات"><Input name="notes" maxLength={500} /></Field>
      <FormError message={state.error} />
      <SubmitButton pendingText="جارٍ الإرسال…">اطلب مندوب</SubmitButton>
    </form>
  );
}
