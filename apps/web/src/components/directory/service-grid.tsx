import { VERTICAL_META, VERTICALS } from '@dari/contracts';
import Link from 'next/link';
import { ServiceTile } from '@/components/brand/service-icon';

const HREF: Partial<Record<string, string>> = { news: '/news', jobs: '/jobs', events: '/events?kind=event', trips: '/events?kind=trip', property: '/property' };

export function ServiceGrid() {
  return (
    <ul className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6 lg:grid-cols-11">
      {VERTICALS.map((v) => (
        <li key={v}>
          <Link href={HREF[v] ?? `/explore/${v}`} className="group flex flex-col items-center gap-2 text-center">
            <span className="transition-transform group-hover:-translate-y-0.5">
              <ServiceTile vertical={v} />
            </span>
            <span className="text-[13px] font-medium text-ink/85">{VERTICAL_META[v].labelAr}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
