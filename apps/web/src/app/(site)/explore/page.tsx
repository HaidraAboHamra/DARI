import { VERTICAL_META, VERTICALS } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ServiceTile } from '@/components/brand/service-icon';
import { PageHeader } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'استكشف سلمية' };

const HREF: Partial<Record<string, string>> = { news: '/news', jobs: '/jobs' };

export default function ExplorePage() {
  return (
    <>
      <PageHeader title="استكشف سلمية" subtitle="كل خدمات المدينة مرتبة حسب القطاع" />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VERTICALS.map((v) => (
          <li key={v}>
            <Link href={HREF[v] ?? `/explore/${v}`} className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-lg">
              <ServiceTile vertical={v} />
              <div>
                <p className="font-display text-lg font-bold text-navy">{VERTICAL_META[v].labelAr}</p>
                <p className="text-sm text-muted">{VERTICAL_META[v].labelEn}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
