import type { BusinessDetail, BusinessRole } from '@dari/contracts';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ServiceTile } from '@/components/brand/service-icon';
import { NavLink } from '@/components/shell/nav-link';
import { Badge } from '@/components/ui/primitives';
import { apiOrNull } from '@/lib/api';
import { requireUser } from '@/lib/guards';

export default async function BusinessConsoleLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/merchant/${id}`);
  const business = await apiOrNull<BusinessDetail & { role: BusinessRole | 'admin' }>(`/merchant/businesses/${id}`);
  if (!business) notFound();

  const tabs = [
    { href: `/merchant/${id}`, label: 'الطلبات واللوحة' },
    { href: `/merchant/${id}/products`, label: 'الكتالوج' },
    { href: `/merchant/${id}/customers`, label: 'الزبائن CRM' },
    { href: `/merchant/${id}/team`, label: 'الفريق' },
  ];
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-4">
        <ServiceTile vertical={business.vertical} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold text-navy">{business.name}</h1>
          <p className="text-sm text-muted">
            {business.status === 'active' ? (
              <a href={`/b/${business.slug}`} className="text-gold-deep underline" target="_blank" rel="noreferrer">صفحتك العامة ↗</a>
            ) : (
              'بانتظار التحقق قبل الظهور للعامة'
            )}
          </p>
        </div>
        <Badge tone="navy">{business.role}</Badge>
      </header>
      <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-sand px-4">
        {tabs.map((t) => (
          <NavLink key={t.href} href={t.href} exact={t.href === `/merchant/${id}`} className="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-muted" activeClassName="!border-gold !text-navy">
            {t.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
