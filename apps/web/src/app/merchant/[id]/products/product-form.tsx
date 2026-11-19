'use client';

import type { Product } from '@dari/contracts';
import { useActionState, useEffect, useRef, useState } from 'react';
import { saveProduct } from '@/actions/merchant';
import { ImageUploader } from '@/components/media/image-uploader';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input } from '@/components/ui/primitives';

export function ProductForm({ businessId, product, onDone }: { businessId: string; product?: Product; onDone?: () => void }) {
  const [state, action] = useActionState(async (prev: Parameters<typeof saveProduct>[2], form: FormData) => {
    const result = await saveProduct(businessId, product?.id ?? null, prev, form);
    if (result.ok) onDone?.();
    return result;
  }, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    if (state.ok && !product) {
      formRef.current?.reset();
      setResetKey((k) => k + 1);
    }
  }, [state, product]);
  const e = state.fieldErrors ?? {};
  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
      <Field label="الاسم" error={e.name}><Input name="name" required defaultValue={product?.name} /></Field>
      <Field label="القسم" error={e.section}><Input name="section" defaultValue={product?.section ?? ''} placeholder="مشاوي، مشروبات…" /></Field>
      <Field label="السعر (ل.س)" error={e.price}><Input name="price" inputMode="numeric" required defaultValue={product?.price} /></Field>
      <Field label="المخزون" error={e.stock} hint="فارغ = غير محدود"><Input name="stock" inputMode="numeric" defaultValue={product?.stock ?? ''} /></Field>
      <SubmitButton size="md" pendingText="…">{product ? 'حفظ' : 'إضافة'}</SubmitButton>
      <div className="sm:col-span-5"><ImageUploader key={resetKey} name="imageUrl" max={1} initial={product?.imageUrl ? [product.imageUrl] : []} /></div>
      <div className="sm:col-span-5"><FormError message={state.error} />{state.ok && !product && <p className="text-sm font-semibold text-success">{state.message}</p>}</div>
    </form>
  );
}
