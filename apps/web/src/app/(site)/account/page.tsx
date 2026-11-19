import type { Membership, UserProfile } from '@dari/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { logout } from '@/actions/auth';
import { ServiceTile } from '@/components/brand/service-icon';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { requireUser } from '@/lib/guards';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'حسابي' };

const LINKS = [
  { href: '/orders', label: 'طلباتي' },
  { href: '/delivery', label: 'طلبات التوصيل' },
  { href: '/account/notifications', label: 'الإشعارات' },
  { href: '/merchant', label: 'لوحة التاجر — Merchant OS' },
];

export default async function AccountPage() {
  const session = await requireUser('/account');
  const [me, memberships] = await Promise.all([api<UserProfile>('/me'), api<Membership[]>('/me/businesses')]);
  const staffLinks = [
    session.role === 'courier' || session.role === 'admin' ? { href: '/courier', label: 'لوحة المندوب' } : null,
    session.role === 'admin' ? { href: '/admin', label: 'ذكاء المدينة والإدارة' } : null,
  ].filter((l): l is { href: string; label: string } => l !== null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={me.name ?? 'حسابي'} subtitle={me.phone}>
        {me.role !== 'citizen' && <Badge tone="navy">{me.role}</Badge>}
      </PageHeader>
      <section className="card p-5">
        <ProfileForm name={me.name} />
      </section>

      <nav className="card divide-y divide-sand/70">
        {[...LINKS, ...staffLinks].map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center justify-between p-4 font-medium hover:bg-ivory">
            {l.label} <span aria-hidden="true" className="text-muted">‹</span>
          </Link>
        ))}
      </nav>

      {memberships.length > 0 && (
        <section>
          <SectionHeader title="أنشطتي التجارية" />
          <ul className="flex flex-col gap-2">
            {memberships.map((m) => (
              <li key={m.business.id}>
                <Link href={`/merchant/${m.business.id}`} className="card flex items-center gap-3 p-3 hover:shadow-lg">
                  <ServiceTile vertical={m.business.vertical} size="sm" />
                  <span className="flex-1 font-semibold text-navy">{m.business.name}</span>
                  <Badge>{m.role}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form action={logout}>
        <SubmitButton variant="danger" className="w-full">تسجيل الخروج</SubmitButton>
      </form>
    </div>
  );
}
