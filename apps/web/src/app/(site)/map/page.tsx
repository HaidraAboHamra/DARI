import { type MapPoint, VERTICAL_META, VERTICALS } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CityMap } from '@/components/map/city-map';
import { PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'خريطة المدينة' };
const SALAMIYAH: [number, number] = [35.0113, 37.0532];

export default async function MapPage({ searchParams }: { searchParams: Promise<{ vertical?: string }> }) {
  const { vertical: raw } = await searchParams;
  const vertical = (VERTICALS as readonly string[]).includes(raw ?? '') ? raw : undefined;
  const points = await api<MapPoint[]>('/businesses/map', { query: { city: config.city, vertical }, revalidate: 60 });
  const chip = (active: boolean) => `shrink-0 rounded-full px-3.5 py-1.5 text-sm ${active ? 'bg-navy text-champagne' : 'border border-sand bg-white'}`;
  return (
    <>
      <PageHeader title="دليل المدينة على الخريطة" subtitle={`${points.length} نشاط`} />
      <nav className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        <Link href="/map" className={chip(!vertical)}>الكل</Link>
        {VERTICALS.filter((v) => v !== 'news' && v !== 'jobs').map((v) => (
          <Link key={v} href={`/map?vertical=${v}`} className={chip(vertical === v)}>
            <span className="me-1 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VERTICAL_META[v].color }} />
            {VERTICAL_META[v].labelAr}
          </Link>
        ))}
      </nav>
      <CityMap points={points} center={SALAMIYAH} />
    </>
  );
}
