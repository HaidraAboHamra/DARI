'use client';

import type { BusinessDetail } from '@dari/contracts';
import { useActionState } from 'react';
import { updateBusinessSettings } from '@/actions/merchant';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Textarea } from '@/components/ui/primitives';

export function SettingsForm({ business }: { business: BusinessDetail }) {
  const [state, action] = useActionState(updateBusinessSettings.bind(null, business.id), {});
  return (
    <form action={action} className="card grid gap-4 p-6 sm:grid-cols-2">
      <Field label="الهاتف"><Input name="phone" type="tel" dir="ltr" defaultValue={business.phone ?? ''} /></Field>
      <Field label="رسم توصيل خاص (اتركه فارغاً لاعتماد رسم المدينة)">
        <Input name="deliveryFee" inputMode="numeric" defaultValue={business.deliveryFee ?? ''} />
      </Field>
      <div className="sm:col-span-2"><Field label="العنوان"><Input name="address" defaultValue={business.address ?? ''} /></Field></div>
      <div className="sm:col-span-2"><Field label="الوصف"><Textarea name="description" defaultValue={business.description ?? ''} /></Field></div>
      <label className="flex items-center gap-3 sm:col-span-2">
        <input type="checkbox" name="acceptsOrders" defaultChecked={business.acceptsOrders} className="h-5 w-5 accent-[#C9A24B]" />
        <span className="font-medium">استقبال الطلبات عبر داري</span>
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton pendingText="جارٍ الحفظ…">حفظ</SubmitButton>
        {state.ok && <span className="text-sm font-semibold text-success">{state.message}</span>}
        <FormError message={state.error} />
      </div>
    </form>
  );
}
