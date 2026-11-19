import type { Connection, Favorite } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { disconnectBusiness } from '@/actions/marketing';
import { ServiceTile } from '@/components/brand/service-icon';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { requireUser } from '@/lib/guards';

export const metadata: Metadata = { title: 'المفضلة والمتابعات' };

export default async function FavoritesPage() {
  await requireUser('/account/favorites');
  const [favorites, connections] = await Promise.all([api<Favorite[]>('/me/favorites'), api<Connection[]>('/me/connections')]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <PageHeader title="المفضلة" />
      {favorites.length === 0 ? <EmptyState title="لا شيء في المفضلة بعد" hint="اضغط ♡ على أي نشاط أو عقار أو فعالية لحفظه هنا." /> : (
        <ul className="card divide-y divide-sand/70">
          {favorites.map((f) => (
            <li key={`${f.entityType}-${f.entityId}`}>
              <Link href={f.href} className="flex items-center gap-3 p-3 hover:bg-ivory">
                {f.vertical && <ServiceTile vertical={f.vertical} size="sm" />}
                <span className="font-semibold text-navy">{f.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section>
        <SectionHeader title="أنشطة أتابع عروضها" />
        {connections.length === 0 ? <p className="text-sm text-muted">لا تتابع أي نشاط.</p> : (
          <ul className="card divide-y divide-sand/70">
            {connections.map((c) => (
              <li key={c.business.id} className="flex items-center justify-between gap-3 p-3">
                <Link href={`/b/${c.business.slug}`} className="font-semibold text-navy">{c.business.name}</Link>
                <form action={disconnectBusiness.bind(null, c.business.id)}><SubmitButton size="sm" variant="ghost">إلغاء المتابعة</SubmitButton></form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
