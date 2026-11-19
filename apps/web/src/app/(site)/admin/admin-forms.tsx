'use client';

import { PAYMENT_METHODS, PLAN_IDS, PLANS, PLATFORM_ROLES } from '@dari/contracts';
import { useActionState } from 'react';
import { featureBusiness, recordPayment, setUserRole } from '@/actions/admin';
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
