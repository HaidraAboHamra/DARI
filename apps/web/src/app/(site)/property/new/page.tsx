import type { Area } from '@dari/contracts';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { requireUser } from '@/lib/guards';
import { ListingForm } from './listing-form';

export const metadata: Metadata = { title: 'أضف إعلاناً عقارياً' };

export default async function NewListingPage() {
  await requireUser('/property/new');
  const areas = await api<Area[]>(`/cities/${config.city}/areas`, { revalidate: 300 });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="أضف إعلاناً عقارياً" subtitle="الإعلان الأساسي مجاني" />
      <ListingForm areas={areas} />
    </div>
  );
}
