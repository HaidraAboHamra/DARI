'use client';

import { type DeliveryPricing, PAYMENT_METHODS, PLAN_IDS, PLANS, PLATFORM_ROLES, quoteDelivery, ROAD_FACTOR } from '@dari/contracts';
import { useActionState, useState } from 'react';
import { featureBusiness, recordPayment, saveDeliveryPricing, setUserRole } from '@/actions/admin';
import { money } from '@/lib/format';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select } from '@/components/ui/primitives';

type Option = { id: string; name: string };
const METHOD_LABEL: Record<string, string> = { cash: 'نقداً', transfer: 'حوالة', mobile_wallet: 'محفظة إلكترونية' };

function Result({ state }: { state: { ok?: boolean; message?: string | null; error?: string | null } }) {
  return state.ok ? <p className="text-sm font-semibold text-success">{state.message}</p> : <FormError message={state.error} />;
}

export function PaymentForm({ businesses }: { businesses: Option[] }) {
  const [state, action] = useActionState(recordPayment, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <Field label="النشاط"><Select name="businessId">{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
      <Field label="الباقة"><Select name="plan">{PLAN_IDS.filter((p) => p !== 'free').map((p) => <option key={p} value={p}>{PLANS[p].nameAr}</option>)}</Select></Field>
      <Field label="المدة (شهر)"><Input name="months" inputMode="numeric" defaultValue="1" /></Field>
      <Field label="المبلغ المقبوض"><Input name="amount" inputMode="numeric" required /></Field>
      <Field label="طريقة الدفع"><Select name="method">{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</Select></Field>
      <Field label="مرجع / إيصال"><Input name="reference" /></Field>
      <div className="flex items-center gap-3 sm:col-span-3"><SubmitButton pendingText="…">تسجيل الدفعة وتفعيل الباقة</SubmitButton><Result state={state} /></div>
    </form>
  );
}

export function FeatureForm({ businesses }: { businesses: Option[] }) {
  const [state, action] = useActionState(featureBusiness, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
      <Field label="النشاط"><Select name="businessId">{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
      <Field label="أيام الظهور المميز (0 = إلغاء)"><Input name="days" inputMode="numeric" defaultValue="7" /></Field>
      <SubmitButton pendingText="…">تطبيق</SubmitButton>
      <div className="sm:col-span-3"><Result state={state} /></div>
    </form>
  );
}

export function RoleForm() {
  const [state, action] = useActionState(setUserRole, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
      <Field label="رقم المستخدم"><Input name="phone" type="tel" dir="ltr" required /></Field>
      <Field label="الدور"><Select name="role">{PLATFORM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
      <SubmitButton pendingText="…">تعيين</SubmitButton>
      <div className="sm:col-span-3"><Result state={state} /></div>
    </form>
  );
}

/** City delivery pricing with a live preview of what customers will pay at common distances. */
export function DeliveryPricingForm({ city, initial }: { city: string; initial: DeliveryPricing }) {
  const [state, action] = useActionState(saveDeliveryPricing, {});
  const [p, setP] = useState(initial);
  const set = (k: keyof DeliveryPricing) => (e: React.ChangeEvent<HTMLInputElement>) => setP((c) => ({ ...c, [k]: Number(e.target.value) || 0 }));
  const sample = [1, 2, 3, 5, 8];
  // Preview with the same shared function the API uses (distance → fee); ROAD_FACTOR is undone so «km» means road km.
  const at = (km: number) => quoteDelivery(p, { lat: 35, lng: 37 }, { lat: 35 + km / ROAD_FACTOR / 111.195, lng: 37 });
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="city" value={city} />
      <div className="grid gap-3 sm:grid-cols-5">
        <Field label="رسم أول كيلومتر"><Input name="baseFee" inputMode="numeric" value={p.baseFee} onChange={set('baseFee')} /></Field>
        <Field label="لكل كيلومتر إضافي"><Input name="perKm" inputMode="numeric" value={p.perKm} onChange={set('perKm')} /></Field>
        <Field label="أقل رسم"><Input name="minFee" inputMode="numeric" value={p.minFee} onChange={set('minFee')} /></Field>
        <Field label="أقصى مسافة (كم)"><Input name="maxKm" inputMode="decimal" value={p.maxKm} onChange={set('maxKm')} /></Field>
        <Field label="التقريب لأقرب"><Input name="roundTo" inputMode="numeric" value={p.roundTo} onChange={set('roundTo')} /></Field>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead><tr className="text-muted">{sample.map((km) => <th key={km} className="p-2 font-medium">{km} كم</th>)}</tr></thead>
          <tbody><tr>{sample.map((km) => { const q = at(km); return <td key={km} className="p-2 font-bold text-navy">{q.deliverable ? money(q.fee) : 'خارج النطاق'}</td>; })}</tr></tbody>
        </table>
      </div>
      <p className="text-sm text-muted">المسافة تُحسب من موقع المطعم إلى موقع الزبون الدقيق (GPS) على الطرق تقريباً. المطاعم التي حدّدت رسماً خاصاً تبقى على رسمها.</p>
      <div className="flex items-center gap-3"><SubmitButton pendingText="…">حفظ التسعير</SubmitButton><Result state={state} /></div>
    </form>
  );
}
