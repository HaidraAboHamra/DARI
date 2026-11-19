import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/primitives';
import { requireUser } from '@/lib/guards';
import { ArticleForm } from './article-form';

export const metadata: Metadata = { title: 'تحرير الأخبار' };

export default async function EditorPage() {
  await requireUser('/editor', ['editor']);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="نبض المدينة — تحرير" subtitle="الأخبار تُنشر بعد التحقق المحلي (blueprint §11.2)" />
      <ArticleForm />
    </div>
  );
}
