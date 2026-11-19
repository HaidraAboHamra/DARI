'use client';

import { useActionState } from 'react';
import { publishArticle } from '@/actions/admin';
import { ImageUploader } from '@/components/media/image-uploader';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/primitives';

const CATEGORIES = ['مجتمع', 'خدمات', 'اقتصاد', 'فعاليات', 'تنبيهات', 'افتتاحات وعروض'];

export function ArticleForm() {
  const [state, action] = useActionState(publishArticle, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="card flex flex-col gap-4 p-6">
      <Field label="العنوان" error={e.title}><Input name="title" required minLength={5} /></Field>
      <Field label="الملخص" error={e.summary}><Textarea name="summary" rows={2} required minLength={10} /></Field>
      <Field label="النص الكامل" error={e.body}><Textarea name="body" rows={10} required minLength={20} /></Field>
      <Field label="التصنيف"><Select name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <ImageUploader name="coverUrl" max={1} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="draft" className="accent-[#C9A24B]" /> حفظ كمسودة (للمراجعة المحلية قبل النشر)</label>
      <FormError message={state.error} />
      {state.ok && <p className="text-sm font-semibold text-success">{state.message}</p>}
      <SubmitButton pendingText="…">نشر</SubmitButton>
    </form>
  );
}
