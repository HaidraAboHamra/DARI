'use client';

import { useActionState } from 'react';
import { applyToJob } from '@/actions/community';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Textarea } from '@/components/ui/primitives';

export function ApplyForm({ jobId }: { jobId: string }) {
  const [state, action] = useActionState(applyToJob.bind(null, jobId), {});
  if (state.ok) return <p className="card p-5 text-center font-semibold text-success">{state.message}</p>;
  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <h2 className="font-display text-lg font-bold text-navy">قدّم الآن</h2>
      <Field label="رسالة قصيرة عن خبرتك">
        <Textarea name="message" maxLength={2000} placeholder="خبرتي، مؤهلاتي، أوقات التفرغ…" />
      </Field>
      <Field label="رقم للتواصل (اختياري)" hint="إذا تركته فارغاً نستخدم رقم حسابك">
        <Input name="phone" type="tel" dir="ltr" />
      </Field>
      <FormError message={state.error} />
      <SubmitButton pendingText="جارٍ الإرسال…">إرسال الطلب</SubmitButton>
    </form>
  );
}
