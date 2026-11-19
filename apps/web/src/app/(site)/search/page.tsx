import { type SearchHit, type SearchResponse, VERTICAL_META } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard, JobCard } from '@/components/content/cards';
import { BusinessCard } from '@/components/directory/business-card';
import { SearchBar } from '@/components/directory/search-bar';
import { ResultLink } from '@/components/directory/result-link';
import { ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { money } from '@/lib/format';

export const metadata: Metadata = { title: 'بحث' };

const INTENT_LABEL: Record<string, string> = {
  discover: 'استكشاف',
  find: 'بحث',
  urgent: 'حاجة عاجلة',
  buy: 'شراء وطلب',
  book: 'حجز',
  attend: 'فعالية',
  travel: 'رحلة',
  apply: 'وظيفة',
  property: 'عقار',
  stay: 'إقامة',
  service: 'خدمة',
  information: 'معلومة',
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const result = q.trim() ? await api<SearchResponse>('/search', { query: { q, city: config.city, limit: 20 } }) : null;

  return (
    <div className="flex flex-col gap-6">
      <SearchBar defaultValue={q} suggestions={!q} />
      {result && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>فهمنا أنك تبحث عن</span>
            <Badge tone="navy">{INTENT_LABEL[result.intent.intent]}</Badge>
            {result.intent.vertical && <Badge tone="gold">{VERTICAL_META[result.intent.vertical].labelAr}</Badge>}
            {result.intent.urgency && <Badge tone="danger">الآن</Badge>}
            <span className="ms-auto">{result.total} نتيجة</span>
          </div>

          {result.total === 0 ? (
            <EmptyState title="ما لقينا شي مطابق بعد" hint="سجّلنا طلبك — كل بحث بدون نتيجة يساعدنا نضيف الخدمات اللي ناقصة بسلمية.">
              <ButtonLink href="/delivery" variant="secondary">
                اطلب «اشترِ لي» عبر التوصيل
              </ButtonLink>
            </EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {result.hits.map((hit) => (
                <li key={`${hit.kind}-${hit.item.id}`}>
                  <ResultLink searchId={result.searchId} entityType={entityType(hit)} entityId={hit.item.id}>
                    <Hit hit={hit} />
                  </ResultLink>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function entityType(hit: SearchHit) {
  return hit.kind === 'article' ? 'news' : hit.kind;
}

function Hit({ hit }: { hit: SearchHit }) {
  switch (hit.kind) {
    case 'business':
      return <BusinessCard business={hit.item} />;
    case 'job':
      return <JobCard job={hit.item} />;
    case 'article':
      return <ArticleCard article={hit.item} />;
    case 'product':
      return (
        <Link href={`/b/${hit.item.businessSlug}`} className="card flex items-center justify-between gap-3 p-4 hover:shadow-lg">
          <div className="min-w-0">
            <p className="truncate font-bold text-navy">{hit.item.name}</p>
            <p className="truncate text-sm text-muted">من {hit.item.businessName}</p>
          </div>
          <span className="shrink-0 font-semibold text-gold-deep">{money(hit.item.price)}</span>
        </Link>
      );
  }
}
