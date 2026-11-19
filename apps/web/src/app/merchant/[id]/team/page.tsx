import type { BusinessRole } from '@dari/contracts';
import { Badge, EmptyState, SectionHeader } from '@/components/ui/primitives';
import { apiOrNull } from '@/lib/api';
import { AddMemberForm } from './add-member-form';
import { ROLE_LABEL } from './roles';

interface Member {
  userId: string;
  name: string | null;
  phone: string;
  role: BusinessRole;
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const members = await apiOrNull<Member[]>(`/merchant/businesses/${id}/members`);
  if (!members) return <EmptyState title="إدارة الفريق متاحة للمالك والمدير فقط" />;
  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <SectionHeader title="إضافة موظف" />
        <AddMemberForm businessId={id} />
        <p className="mt-3 text-xs text-muted">كل دور يرى ويعدّل فقط ما يحتاجه: الكاشير يدير الطلبات، المستودع يدير الكتالوج والمخزون، المحاسب يرى التقارير.</p>
      </section>
      <ul className="card divide-y divide-sand/70">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-navy">{m.name ?? 'بدون اسم'}</p>
              <p className="text-sm text-muted" dir="ltr">{m.phone}</p>
            </div>
            <Badge tone={m.role === 'owner' ? 'navy' : 'neutral'}>{ROLE_LABEL[m.role]}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
