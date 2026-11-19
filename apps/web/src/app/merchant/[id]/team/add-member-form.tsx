'use client';

import { BUSINESS_ROLES } from '@dari/contracts';
import { useActionState } from 'react';
import { addMember } from '@/actions/merchant';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select } from '@/components/ui/primitives';
import { ROLE_LABEL } from './roles';

export function AddMemberForm({ businessId }: { businessId: string }) {
  const [state, action] = useActionState(addMember.bind(null, businessId), {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="رقم موبايل الموظف" error={state.fieldErrors?.phone}><Input name="phone" type="tel" dir="ltr" required /></Field>
      <Field label="الدور">
        <Select name="role" defaultValue="cashier">
          {BUSINESS_ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
      </Field>
      <SubmitButton pendingText="…">إضافة</SubmitButton>
      <div className="sm:col-span-3">
        <FormError message={state.error} />
        {state.ok && <p className="text-sm font-semibold text-success">{state.message}</p>}
      </div>
    </form>
  );
}
