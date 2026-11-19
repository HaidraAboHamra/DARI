import type { Area, Category } from '@dari/contracts';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { requireUser } from '@/lib/guards';
import { ServiceRequestForm } from './request-form';

export const metadata: Metadata = { title: 'اطلب خدمة' };

export default async function NewServiceRequestPage({ searchParams }: { searchParams: Promise<{ category?: string; target?: string; name?: string }> }) {
  const { category, target, name } = await searchParams;
  await requireUser(`/services/new${target ? `?target=${target}` : ''}`);
  const [services, health, areas] = await Promise.all([
    api<Category[]>('/categories', { query: { vertical: 'services' }, revalidate: 300 }),
    api<Category[]>('/categories', { query: { vertical: 'health' }, revalidate: 300 }),
    api<Area[]>(`/cities/${config.city}/areas`, { revalidate: 300 }),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="شو المشكلة؟" subtitle="سبّاك، كهربائي، تكييف، تنظيف… نوصلك بأقرب مقدم خدمة" />
      <ServiceRequestForm
        categories={[...services, ...health.filter((c) => c.slug === 'labs')]}
        areas={areas}
        defaults={{ categoryId: category, targetBusinessId: target, targetName: name }}
      />
    </div>
  );
}
