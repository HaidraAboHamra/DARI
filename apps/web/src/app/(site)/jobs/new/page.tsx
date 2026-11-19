import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/primitives';
import { requireUser } from '@/lib/guards';
import { JobForm } from './job-form';

export const metadata: Metadata = { title: 'أضف وظيفة' };

export default async function NewJobPage() {
  await requireUser('/jobs/new');
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="أضف وظيفة" subtitle="النشر الأساسي مجاني" />
      <JobForm />
    </div>
  );
}
