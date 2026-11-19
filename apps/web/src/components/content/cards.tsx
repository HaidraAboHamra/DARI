import type { Article, Job } from '@dari/contracts';
import { VERTICAL_META } from '@dari/contracts';
import Link from 'next/link';
import { ServiceGlyph } from '@/components/brand/service-icon';
import { Badge } from '@/components/ui/primitives';
import { money, timeAgo } from '@/lib/format';
import { EMPLOYMENT_LABEL } from '@/lib/labels';

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/news/${article.slug}`} className="card flex gap-3 p-4 transition-shadow hover:shadow-lg">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${VERTICAL_META.news.color}1F` }}>
        <ServiceGlyph vertical="news" className="h-7 w-7" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold" style={{ color: VERTICAL_META.news.color }}>
          {article.category ?? 'أخبار'} {article.publishedAt && `· ${timeAgo(article.publishedAt)}`}
        </p>
        <h3 className="mt-0.5 line-clamp-2 font-bold leading-snug text-navy">{article.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{article.summary}</p>
      </div>
    </Link>
  );
}

export function JobCard({ job }: { job: Job }) {
  const salary =
    job.salaryMin && job.salaryMax ? `${money(job.salaryMin)} – ${money(job.salaryMax)}` : job.salaryMin ? `من ${money(job.salaryMin)}` : null;
  return (
    <Link href={`/jobs/${job.id}`} className="card flex flex-col gap-2 p-4 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-navy">{job.title}</h3>
        <Badge>{EMPLOYMENT_LABEL[job.employmentType]}</Badge>
      </div>
      <p className="text-sm text-muted">{[job.businessName, job.areaName, timeAgo(job.publishedAt)].filter(Boolean).join(' · ')}</p>
      {salary && <p className="text-sm font-semibold text-gold-deep">{salary}</p>}
    </Link>
  );
}
