'use client';

import { useActionState } from 'react';
import { updateProfile } from '@/actions/auth';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input } from '@/components/ui/primitives';

export function ProfileForm({ name }: { name: string | null }) {
  const [state, action] = useActionState(updateProfile, {});
  return (
    <form action={action} className="flex items-end gap-3">
      <div className="flex-1">
        <Field label="الاسم" error={state.fieldErrors?.name}>
          <Input name="name" defaultValue={name ?? ''} minLength={2} maxLength={80} />
        </Field>
      </div>
      <SubmitButton variant="secondary">{state.ok ? 'تم ✓' : 'حفظ'}</SubmitButton>
      <FormError message={state.error} />
    </form>
  );
}
