'use client';

import { RESOURCE_KINDS } from '@dari/contracts';
import { useActionState, useState } from 'react';
import { createResource } from '@/actions/bookings';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select } from '@/components/ui/primitives';

const KIND_LABEL: Record<string, string> = { appointment: 'مواعيد', court: 'ملعب', room: 'غرفة', venue: 'صالة', farm: 'مزرعة/شاليه', table: 'طاولة', seat: 'مقعد' };
const DAY_LABEL = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function ResourceForm({ businessId }: { businessId: string }) {
  const [state, action] = useActionState(createResource.bind(null, businessId), {});
  const [unit, setUnit] = useState<'slot' | 'night'>('slot');
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <Field label="الاسم"><Input name="name" required placeholder="كشف عام، ملعب 1، غرفة مزدوجة…" /></Field>
      <Field label="النوع"><Select name="kind">{RESOURCE_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</Select></Field>
      <Field label="طريقة الحجز">
        <Select name="unit" value={unit} onChange={(e) => setUnit(e.target.value as 'slot' | 'night')}>
          <option value="slot">بالموعد/الساعة</option>
          <option value="night">بالليلة</option>
        </Select>
      </Field>
      <Field label={unit === 'slot' ? 'السعر للموعد' : 'السعر لليلة'}><Input name="price" inputMode="numeric" defaultValue="0" /></Field>
      <Field label="السعة المتزامنة" hint="عدد الحجوزات بنفس الوقت"><Input name="capacity" inputMode="numeric" defaultValue="1" /></Field>
      {unit === 'slot' && <Field label="مدة الموعد (دقيقة)"><Input name="slotMinutes" inputMode="numeric" defaultValue="60" /></Field>}
      {unit === 'slot' && (
        <>
          <fieldset className="flex flex-wrap gap-2 sm:col-span-3">
            <legend className="mb-1 text-sm font-semibold text-navy">أيام العمل</legend>
            {DAY_LABEL.map((d, i) => (
              <label key={d} className="flex items-center gap-1.5 rounded-full border border-sand px-3 py-1.5 text-sm">
                <input type="checkbox" name={`day${i}`} defaultChecked={i !== 5} className="accent-[#C9A24B]" /> {d}
              </label>
            ))}
          </fieldset>
          <Field label="من"><Input type="time" name="open" defaultValue="09:00" /></Field>
          <Field label="إلى"><Input type="time" name="close" defaultValue="17:00" /></Field>
        </>
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-3">
        <input type="checkbox" name="autoConfirm" className="h-4 w-4 accent-[#C9A24B]" /> تأكيد تلقائي للحجوزات
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <SubmitButton pendingText="…">إضافة مورد</SubmitButton>
        {state.ok && <span className="text-sm font-semibold text-success">{state.message}</span>}
        <FormError message={state.error} />
      </div>
    </form>
  );
}
