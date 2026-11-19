import type { Metadata } from 'next';
import { markNotificationsRead } from '@/actions/community';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { requireUser } from '@/lib/guards';

export const metadata: Metadata = { title: 'الإشعارات' };

interface Inbox {
  unread: number;
  items: { id: string; title: string; body: string; readAt: string | null; createdAt: string }[];
}

export default async function NotificationsPage() {
  await requireUser('/account/notifications');
  const inbox = await api<Inbox>('/me/notifications', { query: { limit: 50 } });
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="الإشعارات" subtitle={inbox.unread ? `${inbox.unread} غير مقروء` : undefined}>
        {inbox.unread > 0 && (
          <form action={markNotificationsRead}>
            <SubmitButton size="sm" variant="secondary">تحديد الكل كمقروء</SubmitButton>
          </form>
        )}
      </PageHeader>
      {inbox.items.length === 0 ? (
        <EmptyState title="لا إشعارات بعد" />
      ) : (
        <ul className="card divide-y divide-sand/70">
          {inbox.items.map((n) => (
            <li key={n.id} className={`flex gap-3 p-4 ${n.readAt ? '' : 'bg-champagne/15'}`}>
              {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="غير مقروء" />}
              <div>
                <p className="font-semibold text-navy">{n.title}</p>
                <p className="text-sm text-muted">{n.body} · {timeAgo(n.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
