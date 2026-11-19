import type { Area, Category } from '@dari/contracts';
import { PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { requireUser } from '@/lib/guards';
import { RegisterForm } from './register-form';

export default async function NewBusinessPage() {
  await requireUser('/merchant/new');
  const [categories, areas] = await Promise.all([
    api<Category[]>('/categories', { revalidate: 300 }),
    api<Area[]>(`/cities/${config.city}/areas`, { revalidate: 300 }),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="سجّل نشاطك على داري" subtitle="مجاناً — صفحة رقمية مستقلة يمكن مشاركتها على واتساب وفيسبوك" />
      <RegisterForm categories={categories} areas={areas} />
    </div>
  );
}
