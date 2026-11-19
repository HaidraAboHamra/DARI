import type { Ticket } from '@dari/contracts';
import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { cancelTicket } from '@/actions/events';
import { ButtonLink } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge, EmptyState, PageHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { requireUser } from '@/lib/guards';
import { eventWhen } from '@/lib/labels';

export const metadata: Metadata = { title: 'تذاكري' };

export default async function TicketsPage() {
  await requireUser('/tickets');
  const tickets = await api<Ticket[]>('/me/tickets');
  const qr = await Promise.all(
    tickets.map((t) => QRCode.toString(t.code, { type: 'svg', margin: 1, color: { dark: '#0B1424', light: '#FFFFFF' }, errorCorrectionLevel: 'M' })),
  );
  return (
    <>
      <PageHeader title="تذاكري" subtitle="أبرز رمز QR عند الدخول" />
      {tickets.length === 0 ? (
        <EmptyState title="لا تذاكر بعد"><ButtonLink href="/events">تصفح الفعاليات</ButtonLink></EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {tickets.map((t, i) => (
            <li key={t.id} className={`card flex gap-4 p-4 ${t.status !== 'active' ? 'opacity-60' : ''}`}>
              <div className="h-32 w-32 shrink-0 [&_svg]:h-full [&_svg]:w-full" aria-label={`رمز التذكرة ${t.code}`} dangerouslySetInnerHTML={{ __html: qr[i]! }} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="font-bold text-navy">{t.eventTitle}</p>
                <p className="text-sm text-muted">{eventWhen(t.startsAt)}</p>
                <p className="text-sm text-muted">{t.venue}</p>
                <p className="text-sm">{t.quantity} مقعد · {money(t.total)}</p>
                <p className="font-mono text-sm font-semibold" dir="ltr">{t.code}</p>
                <div className="mt-auto flex items-center gap-2">
                  <Badge tone={t.status === 'active' ? 'success' : t.status === 'checked_in' ? 'navy' : 'danger'}>
                    {t.status === 'active' ? 'صالحة' : t.status === 'checked_in' ? 'تم الدخول' : 'ملغاة'}
                  </Badge>
                  {t.status === 'active' && new Date(t.startsAt) > new Date() && (
                    <form action={cancelTicket.bind(null, t.id)}><SubmitButton size="sm" variant="ghost">إلغاء</SubmitButton></form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
