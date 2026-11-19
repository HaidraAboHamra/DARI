'use client';

import { useActionState } from 'react';
import { reviewBusiness } from '@/actions/community';
import { SubmitButton } from '@/components/ui/submit-button';
import { FormError, Textarea } from '@/components/ui/primitives';

const ASPECTS = [
  ['rating', 'التقييم العام'],
  ['quality', 'الجودة'],
  ['commitment', 'الالتزام'],
  ['interaction', 'التعامل'],
] as const;

export function ReviewForm({ businessId, slug }: { businessId: string; slug: string }) {
  const [state, action] = useActionState(reviewBusiness.bind(null, businessId, slug), {});
  if (state.ok) return <p className="card p-5 text-center font-semibold text-success">{state.message}</p>;
  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <h3 className="font-display text-lg font-bold text-navy">قيّم تجربتك</h3>
      {ASPECTS.map(([name, label]) => (
        <fieldset key={name} className="flex items-center justify-between gap-3">
          <legend className="sr-only">{label}</legend>
          <span className="text-sm font-medium">{label}</span>
          <span className="flex flex-row-reverse gap-1">
            {[5, 4, 3, 2, 1].map((n) => (
              <label key={n} className="cursor-pointer">
                <input type="radio" name={name} value={n} required={name === 'rating'} className="peer sr-only" />
                <span className="grid h-8 w-8 place-items-center rounded-full border border-sand text-sm peer-checked:border-gold peer-checked:bg-gold peer-checked:text-navy">{n}</span>
              </label>
            ))}
          </span>
        </fieldset>
      ))}
      <Textarea name="body" placeholder="اكتب ملاحظتك (اختياري)" maxLength={1500} />
      <FormError message={state.error} />
      <SubmitButton pendingText="جارٍ الإرسال…">إرسال التقييم</SubmitButton>
    </form>
  );
}
