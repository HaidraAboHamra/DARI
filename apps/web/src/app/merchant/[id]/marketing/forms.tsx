'use client';

import { useActionState } from 'react';
import { createCoupon, sendBroadcast } from '@/actions/marketing';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/primitives';

export function BroadcastForm({ businessId, audience }: { businessId: string; audience: number }) {
  const [state, action] = useActionState(sendBroadcast.bind(null, businessId), {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="العنوان"><Input name="title" required minLength={3} maxLength={100} placeholder="عرض نهاية الأسبوع" /></Field>
      <Field label="الرسالة"><Textarea name="body" required minLength={5} maxLength={400} /></Field>
      <div className="flex items-center gap-3">
        <SubmitButton disabled={audience === 0} pendingText="جارٍ الإرسال…">إرسال إلى {audience} زبون</SubmitButton>
        {state.ok && <span className="text-sm font-semibold text-success">{state.message}</span>}
      </div>
      <FormError message={state.error} />
      <p className="text-xs text-muted">تصل الرسالة كإشعار داخل داري فقط للزبائن الذين وافقوا على متابعتك. رسالة واحدة يومياً كحد أقصى.</p>
    </form>
  );
}

export function CouponForm({ businessId }: { businessId: string }) {
  const [state, action] = useActionState(createCoupon.bind(null, businessId), {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <Field label="الكود" error={e.code}><Input name="code" required dir="ltr" placeholder="FRIDAY10" className="font-mono uppercase" /></Field>
      <Field label="الوصف" error={e.title}><Input name="title" required placeholder="خصم الجمعة" /></Field>
      <Field label="النوع"><Select name="kind"><option value="percent">نسبة ٪</option><option value="amount">مبلغ ثابت</option></Select></Field>
      <Field label="القيمة" error={e.value}><Input name="value" inputMode="numeric" required /></Field>
      <Field label="حد أدنى للطلب"><Input name="minOrder" inputMode="numeric" defaultValue="0" /></Field>
      <Field label="عدد الاستخدامات" hint="فارغ = غير محدود"><Input name="maxUses" inputMode="numeric" /></Field>
      <Field label="صالح لمدة (يوم)" hint="فارغ = بدون انتهاء"><Input name="days" inputMode="numeric" /></Field>
      <div className="flex items-end gap-3 sm:col-span-2">
        <SubmitButton pendingText="…">إنشاء كوبون</SubmitButton>
        {state.ok && <span className="text-sm font-semibold text-success">{state.message}</span>}
        <FormError message={state.error} />
      </div>
    </form>
  );
}
