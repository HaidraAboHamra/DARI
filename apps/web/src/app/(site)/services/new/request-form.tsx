'use client';

import type { Area, Category } from '@dari/contracts';
import { useActionState, useState } from 'react';
import { createServiceRequest } from '@/actions/services';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/primitives';

export function ServiceRequestForm({ categories, areas, defaults }: { categories: Category[]; areas: Area[]; defaults: { categoryId?: string; targetBusinessId?: string; targetName?: string } }) {
  const [state, action] = useActionState(createServiceRequest, {});
  const [urgency, setUrgency] = useState('today');
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="card flex flex-col gap-4 p-6">
      {defaults.targetBusinessId && (
        <>
          <input type="hidden" name="targetBusinessId" value={defaults.targetBusinessId} />
          <p className="rounded-2xl bg-champagne/30 px-4 py-3 text-sm">الطلب موجّه مباشرة إلى <strong>{defaults.targetName}</strong></p>
        </>
      )}
      <Field label="نوع الخدمة" error={e.categoryId}>
        <Select name="categoryId" defaultValue={defaults.categoryId ?? categories[0]?.id}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
        </Select>
      </Field>
      <Field label="اشرح المشكلة" error={e.description}><Textarea name="description" rows={4} required minLength={5} placeholder="مثال: تسريب مي تحت المغسلة من يومين" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="المنطقة"><Select name="areaId" defaultValue=""><option value="">—</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.nameAr}</option>)}</Select></Field>
        <Field label="العنوان التفصيلي" error={e.address} hint="يظهر لمقدم الخدمة فقط بعد اختيارك له"><Input name="address" required minLength={3} /></Field>
      </div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 text-sm font-semibold text-navy">متى؟</legend>
        {[['now', 'الآن — مستعجل'], ['today', 'اليوم'], ['scheduled', 'بموعد']].map(([v, l]) => (
          <label key={v} className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ${urgency === v ? 'bg-navy text-champagne' : 'border border-sand bg-white'}`}>
            <input type="radio" name="urgency" value={v} checked={urgency === v} onChange={() => setUrgency(v!)} className="sr-only" /> {l}
          </label>
        ))}
      </fieldset>
      {urgency === 'scheduled' && <Field label="الموعد المفضل" error={e.preferredAt}><Input type="datetime-local" name="preferredAt" required /></Field>}
      <FormError message={state.error} />
      <SubmitButton size="lg" pendingText="جارٍ الإرسال…">أرسل الطلب لمقدمي الخدمة</SubmitButton>
      <p className="text-center text-xs text-muted">تصلك عروض أسعار من مقدمي الخدمة المعتمدين، وتختار الأنسب.</p>
    </form>
  );
}
