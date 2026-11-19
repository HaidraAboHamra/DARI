'use client';

import { useActionState } from 'react';
import { requestOtp, verifyOtp } from '@/actions/auth';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input } from '@/components/ui/primitives';

export function LoginForm({ next }: { next: string }) {
  const [sent, send] = useActionState(requestOtp, {});
  const [verified, verify] = useActionState(verifyOtp, {});

  if (!sent.ok) {
    return (
      <form action={send} className="flex flex-col gap-4">
        <Field label="رقم الموبايل" error={sent.fieldErrors?.phone} hint="سنرسل لك رمز دخول برسالة قصيرة">
          <Input name="phone" type="tel" inputMode="tel" dir="ltr" placeholder="09xx xxx xxx" autoComplete="tel" required defaultValue={sent.phone} />
        </Field>
        <FormError message={sent.error} />
        <SubmitButton size="lg" pendingText="جارٍ الإرسال…">أرسل الرمز</SubmitButton>
      </form>
    );
  }

  return (
    <form action={verify} className="flex flex-col gap-4">
      <input type="hidden" name="phone" value={sent.phone} />
      <input type="hidden" name="next" value={next} />
      <p className="text-sm text-muted">
        أرسلنا رمزاً إلى <span dir="ltr" className="font-semibold text-navy">{sent.phone}</span>
      </p>
      <Field label="رمز الدخول" error={verified.fieldErrors?.code}>
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          dir="ltr"
          className="text-center text-2xl tracking-[0.5em]"
          required
          autoFocus
        />
      </Field>
      <FormError message={verified.error} />
      <SubmitButton size="lg" pendingText="جارٍ التحقق…">دخول</SubmitButton>
    </form>
  );
}
