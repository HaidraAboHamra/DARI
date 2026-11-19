import type { Article, Page } from '@dari/contracts';
import type { Metadata } from 'next';
import { ArticleCard } from '@/components/content/cards';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'أخبار سلمية' };

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const { cursor } = await searchParams;
  const page = await api<Page<Article>>('/news', { query: { city: config.city, cursor, limit: 20 }, revalidate: 60 });
  return (
    <>
      <PageHeader title="نبض المدينة" subtitle="أخبار وإعلانات سلمية بعد التحقق المحلي" />
      {page.items.length === 0 ? (
        <EmptyState title="لا أخبار بعد" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {page.items.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
      {page.nextCursor && (
        <div className="mt-6 flex justify-center">
          <ButtonLink href={`/news?cursor=${page.nextCursor}`} variant="secondary">المزيد</ButtonLink>
        </div>
      )}
    </>
  );
}
