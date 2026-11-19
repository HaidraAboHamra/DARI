'use client';

import { type Area, type Category, VERTICAL_META, VERTICALS, type Vertical } from '@dari/contracts';
import { useActionState, useState } from 'react';
import { registerBusiness } from '@/actions/merchant';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/primitives';

const LISTABLE = VERTICALS.filter((v) => v !== 'news' && v !== 'jobs');

export function RegisterForm({ categories, areas }: { categories: Category[]; areas: Area[] }) {
  const [state, action] = useActionState(registerBusiness, {});
  const [vertical, setVertical] = useState<Vertical>('food');
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="card grid gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="اسم النشاط" error={e.name}><Input name="name" required minLength={2} /></Field>
      </div>
      <Field label="القطاع" error={e.vertical}>
        <Select name="vertical" value={vertical} onChange={(ev) => setVertical(ev.target.value as Vertical)}>
          {LISTABLE.map((v) => <option key={v} value={v}>{VERTICAL_META[v].labelAr}</option>)}
        </Select>
      </Field>
      <Field label="التصنيف" error={e.categoryId}>
        <Select name="categoryId" key={vertical} defaultValue="">
          <option value="">—</option>
          {categories.filter((c) => c.vertical === vertical).map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
        </Select>
      </Field>
      <Field label="المنطقة" error={e.areaId}>
        <Select name="areaId" defaultValue="">
          <option value="">—</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nameAr}</option>)}
        </Select>
      </Field>
      <Field label="هاتف / واتساب" error={e.phone}><Input name="phone" type="tel" dir="ltr" /></Field>
      <div className="sm:col-span-2">
        <Field label="العنوان" error={e.address}><Input name="address" /></Field>
      </div>
      <Field label="يفتح الساعة"><Input name="open" type="time" defaultValue="09:00" /></Field>
      <Field label="يغلق الساعة"><Input name="close" type="time" defaultValue="22:00" /></Field>
      <div className="sm:col-span-2">
        <Field label="وصف قصير" error={e.description}><Textarea name="description" maxLength={2000} /></Field>
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormError message={state.error} />
        <SubmitButton size="lg" pendingText="جارٍ التسجيل…">تسجيل النشاط</SubmitButton>
        <p className="text-center text-xs text-muted">يظهر نشاطك للعامة بعد التحقق من فريق داري.</p>
      </div>
    </form>
  );
}
