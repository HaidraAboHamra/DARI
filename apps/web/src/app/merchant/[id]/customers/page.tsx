import type { Page } from '@dari/contracts';
import { ButtonLink } from '@/components/ui/button';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { money, number, timeAgo } from '@/lib/format';
import { SEGMENT_LABEL } from '@/lib/labels';

interface Customer {
  userId: string;
  name: string | null;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  segment: string;
  marketingConsent: boolean;
}

export default async function CustomersPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cursor?: string }> }) {
  const { id } = await params;
  const { cursor } = await searchParams;
  const page = await api<Page<Customer>>(`/merchant/businesses/${id}/customers`, { query: { cursor, limit: 30 } });
  if (page.items.length === 0) {
    return <EmptyState title="لا زبائن بعد" hint="يظهر هنا كل زبون أكمل طلباً من نشاطك، مع تصنيفه (جديد، وفي، VIP، معرّض للفقد…)." />;
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">بيانات الزبائن خاصة بنشاطك فقط. أرقام الهواتف لا تُشارك إلا بموافقة الزبون.</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-ivory text-right text-muted">
            <tr>
              <th className="p-3 font-semibold">الزبون</th>
              <th className="p-3 font-semibold">الشريحة</th>
              <th className="p-3 font-semibold">الطلبات</th>
              <th className="p-3 font-semibold">إجمالي الإنفاق</th>
              <th className="p-3 font-semibold">آخر طلب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand/70">
            {page.items.map((c) => (
              <tr key={c.userId}>
                <td className="p-3 font-semibold text-navy">{c.name ?? 'زبون'}</td>
                <td className="p-3"><Badge tone={c.segment === 'vip' || c.segment === 'loyal' ? 'gold' : c.segment === 'at_risk' || c.segment === 'dormant' ? 'danger' : 'neutral'}>{SEGMENT_LABEL[c.segment]}</Badge></td>
                <td className="p-3 tabular-nums">{number(c.ordersCount)}</td>
                <td className="p-3 tabular-nums">{money(c.totalSpent)}</td>
                <td className="p-3 text-muted">{c.lastOrderAt ? timeAgo(c.lastOrderAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {page.nextCursor && <ButtonLink href={`/merchant/${id}/customers?cursor=${page.nextCursor}`} variant="secondary">المزيد</ButtonLink>}
    </div>
  );
}
