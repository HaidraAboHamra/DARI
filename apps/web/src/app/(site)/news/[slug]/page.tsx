import type { Article } from '@dari/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { TrackView } from '@/components/analytics/track-view';
import { apiOrNull } from '@/lib/api';
import { timeAgo } from '@/lib/format';

const getArticle = cache((slug: string) => apiOrNull<Article>(`/news/${encodeURIComponent(decodeURIComponent(slug))}`, { revalidate: 120 }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  return article ? { title: article.title, description: article.summary } : { title: 'غير موجود' };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();
  return (
    <article className="mx-auto max-w-2xl">
      <TrackView name="entity.viewed" entityType="news" entityId={article.id} />
      <p className="text-sm font-semibold text-[#7A4E8C]">
        {article.category ?? 'أخبار'} {article.publishedAt && `· ${timeAgo(article.publishedAt)}`}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-snug text-navy sm:text-4xl">{article.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink/80">{article.summary}</p>
      <div className="mt-6 whitespace-pre-line leading-loose">{article.body}</div>
    </article>
  );
}
