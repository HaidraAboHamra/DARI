'use client';

import { EMPLOYMENT_TYPES } from '@dari/contracts';
import { useActionState } from 'react';
import { postJob } from '@/actions/community';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/primitives';
import { EMPLOYMENT_LABEL } from '@/lib/labels';

export function JobForm() {
  const [state, action] = useActionState(postJob, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="card flex flex-col gap-4 p-6">
      <Field label="المسمى الوظيفي" error={e.title}><Input name="title" required minLength={3} /></Field>
      <Field label="نوع الدوام" error={e.employmentType}>
        <Select name="employmentType" defaultValue="full_time">
          {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_LABEL[t]}</option>)}
        </Select>
      </Field>
      <Field label="الوصف والمتطلبات" error={e.description}><Textarea name="description" rows={6} required minLength={10} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="الراتب من (ل.س)" error={e.salaryMin}><Input name="salaryMin" inputMode="numeric" /></Field>
        <Field label="إلى" error={e.salaryMax}><Input name="salaryMax" inputMode="numeric" /></Field>
      </div>
      <Field label="هاتف التواصل" error={e.contactPhone}><Input name="contactPhone" type="tel" dir="ltr" /></Field>
      <FormError message={state.error} />
      <SubmitButton pendingText="جارٍ النشر…">نشر الوظيفة</SubmitButton>
    </form>
  );
}
