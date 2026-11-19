import type { Membership } from '@dari/contracts';
import Link from 'next/link';
import { ServiceTile } from '@/components/brand/service-icon';
import { ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState, PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { requireUser } from '@/lib/guards';

const STATUS: Record<string, { label: string; tone: 'success' | 'gold' | 'danger' | 'neutral' }> = {
  active: { label: 'فعّال', tone: 'success' },
  pending_review: { label: 'قيد المراجعة', tone: 'gold' },
  suspended: { label: 'موقوف', tone: 'danger' },
  draft: { label: 'مسودة', tone: 'neutral' },
};

export default async function MerchantHome() {
  await requireUser('/merchant');
  const memberships = await api<Membership[]>('/me/businesses');
  return (
    <>
      <PageHeader title="أنشطتي" subtitle="صفحتك الرقمية، طلباتك، مخزونك وزبائنك — بمكان واحد">
        <ButtonLink href="/merchant/new">سجّل نشاطاً جديداً</ButtonLink>
      </PageHeader>
      {memberships.length === 0 ? (
        <EmptyState title="ما عندك نشاط مسجّل بعد" hint="التسجيل مجاني: صفحة مستقلة قابلة للمشاركة، رابط وQR، وظهور في بحث داري.">
          <ButtonLink href="/merchant/new">ابدأ الآن</ButtonLink>
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {memberships.map(({ business, role }) => (
            <li key={business.id}>
              <Link href={`/merchant/${business.id}`} className="card flex items-center gap-4 p-5 hover:shadow-lg">
                <ServiceTile vertical={business.vertical} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold text-navy">{business.name}</p>
                  <p className="text-sm text-muted">دورك: {role}</p>
                </div>
                <Badge tone={STATUS[business.status]!.tone}>{STATUS[business.status]!.label}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
