'use client';

import { type Area, LISTING_PURPOSES, PROPERTY_TYPES } from '@dari/contracts';
import { useActionState } from 'react';
import { createListing } from '@/actions/property';
import { ImageUploader } from '@/components/media/image-uploader';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/primitives';
import { PROPERTY_TYPE_LABEL, PURPOSE_LABEL } from '@/lib/labels';

export function ListingForm({ areas }: { areas: Area[] }) {
  const [state, action] = useActionState(createListing, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="card grid gap-4 p-6 sm:grid-cols-2">
      <Field label="الغرض"><Select name="purpose">{LISTING_PURPOSES.map((p) => <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>)}</Select></Field>
      <Field label="نوع العقار"><Select name="propertyType">{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABEL[t]}</option>)}</Select></Field>
      <div className="sm:col-span-2"><Field label="عنوان الإعلان" error={e.title}><Input name="title" required minLength={5} placeholder="شقة غرفتين وصالون مفروشة" /></Field></div>
      <div className="sm:col-span-2"><Field label="الوصف" error={e.description}><Textarea name="description" rows={5} required minLength={10} /></Field></div>
      <Field label="السعر (ل.س)" error={e.price} hint="للإيجار: السعر الشهري"><Input name="price" inputMode="numeric" required /></Field>
      <Field label="المنطقة"><Select name="areaId" defaultValue=""><option value="">—</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.nameAr}</option>)}</Select></Field>
      <Field label="عدد الغرف"><Input name="rooms" inputMode="numeric" /></Field>
      <Field label="المساحة (م²)"><Input name="sizeSqm" inputMode="numeric" /></Field>
      <div className="sm:col-span-2"><Field label="العنوان"><Input name="address" /></Field></div>
      <div className="sm:col-span-2"><ImageUploader name="images" max={8} /></div>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormError message={state.error} />
        <SubmitButton size="lg" pendingText="جارٍ النشر…">نشر الإعلان</SubmitButton>
      </div>
    </form>
  );
}
