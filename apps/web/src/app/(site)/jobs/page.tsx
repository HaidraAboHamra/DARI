import { EMPLOYMENT_TYPES, type Job, type Page } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { JobCard } from '@/components/content/cards';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { EMPLOYMENT_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'وظائف في سلمية' };

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ type?: string; cursor?: string }> }) {
  const { type, cursor } = await searchParams;
  const employmentType = (EMPLOYMENT_TYPES as readonly string[]).includes(type ?? '') ? type : undefined;
  const page = await api<Page<Job>>('/jobs', { query: { city: config.city, employmentType, cursor, limit: 20 }, revalidate: 30 });
  const chip = (active: boolean) => `shrink-0 rounded-full px-4 py-2 text-sm ${active ? 'bg-navy text-champagne' : 'border border-sand bg-white'}`;

  return (
    <>
      <PageHeader title="وظائف" subtitle="فرص عمل محلية في سلمية وريفها">
        <ButtonLink href="/jobs/new" variant="secondary" size="sm">أضف وظيفة</ButtonLink>
      </PageHeader>
      <nav className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        <Link href="/jobs" className={chip(!employmentType)}>الكل</Link>
        {EMPLOYMENT_TYPES.map((t) => (
          <Link key={t} href={`/jobs?type=${t}`} className={chip(employmentType === t)}>{EMPLOYMENT_LABEL[t]}</Link>
        ))}
      </nav>
      {page.items.length === 0 ? (
        <EmptyState title="لا توجد وظائف بهذا التصنيف حالياً" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {page.items.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
      {page.nextCursor && (
        <div className="mt-6 flex justify-center">
          <ButtonLink href={`/jobs?${new URLSearchParams({ ...(employmentType && { type: employmentType }), cursor: page.nextCursor })}`} variant="secondary">المزيد</ButtonLink>
        </div>
      )}
    </>
  );
}
