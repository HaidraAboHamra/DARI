import type { Job } from '@dari/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { TrackView } from '@/components/analytics/track-view';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { apiOrNull } from '@/lib/api';
import { money, timeAgo } from '@/lib/format';
import { EMPLOYMENT_LABEL } from '@/lib/labels';
import { currentUser } from '@/lib/session';
import { ApplyForm } from './apply-form';

const getJob = cache((id: string) => (/^[0-9a-f-]{36}$/.test(id) ? apiOrNull<Job>(`/jobs/${id}`, { revalidate: 60 }) : Promise.resolve(null)));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const job = await getJob((await params).id);
  return { title: job?.title ?? 'وظيفة' };
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, user] = await Promise.all([getJob(id), currentUser()]);
  if (!job) notFound();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <TrackView name="entity.viewed" entityType="job" entityId={job.id} />
      <article className="card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="navy">{EMPLOYMENT_LABEL[job.employmentType]}</Badge>
          <span className="text-sm text-muted">{timeAgo(job.publishedAt)}</span>
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold text-navy">{job.title}</h1>
        <p className="mt-1 text-muted">{[job.businessName, job.areaName, 'سلمية'].filter(Boolean).join(' · ')}</p>
        {job.salaryMin && (
          <p className="mt-3 font-semibold text-gold-deep">
            {money(job.salaryMin)} {job.salaryMax && `– ${money(job.salaryMax)}`}
          </p>
        )}
        <p className="mt-6 whitespace-pre-line leading-loose">{job.description}</p>
      </article>
      {user ? <ApplyForm jobId={job.id} /> : (
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <p className="font-semibold text-navy">سجّل دخولك لتقديم طلبك</p>
          <ButtonLink href={`/login?next=/jobs/${job.id}`}>دخول</ButtonLink>
        </div>
      )}
    </div>
  );
}
